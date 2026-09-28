"""WSGI API. Serve behind Railway TLS with a secret shared only with Sites."""
import base64
import hmac
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path
from http import HTTPStatus


def valid_email(value):
    if not isinstance(value, str) or not 3 <= len(value) <= 254 or value != value.strip():
        return False
    parts = value.split('@')
    if len(parts) != 2:
        return False
    local, domain = parts
    if not local or len(local) > 64 or local.startswith('.') or local.endswith('.') or '..' in local:
        return False
    labels = domain.split('.')
    return bool(re.fullmatch(r'[A-Za-z0-9._%+\-]+', local) and len(labels) >= 2
                and re.fullmatch(r'[A-Za-z]{2,63}', labels[-1])
                and all(0 < len(label) <= 63 and re.fullmatch(r'[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?', label) for label in labels))


def session_valid(encoded):
    try:
        raw = json.loads(base64.b64decode(encoded, validate=True))
        return (isinstance(raw.get('cookies'), dict) and bool(raw['cookies'])
                and isinstance(raw.get('osids'), dict) and bool(raw['osids'])
                and isinstance(raw.get('android'), dict)
                and isinstance(raw['android'].get('master_token'), str)
                and bool(raw['android']['master_token'])
                and isinstance(raw['android'].get('authorization_tokens'), dict))
    except (ValueError, TypeError, KeyError, AttributeError):
        return False


def install_session(encoded):
    """Keep the GHunt session in the standard private location, never in source."""
    folder = Path.home() / '.malfrats' / 'ghunt'
    folder.mkdir(parents=True, exist_ok=True, mode=0o700)
    target = folder / 'creds.m'
    descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, 'w') as stream:
        stream.write(encoded)
    os.chmod(target, 0o600)


def run_profile(email):
    with tempfile.TemporaryDirectory(prefix='ghunt-result-') as directory:
        output = Path(directory) / 'result.json'
        run = subprocess.run([sys.executable, '-m', 'backend.profile_runner', email, str(output)],
                             stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                             stderr=subprocess.DEVNULL, timeout=75, check=False,
                             env={k: v for k, v in os.environ.items() if k not in {'GHUNT_API_KEY', 'GHUNT_CREDENTIALS_B64', 'GHUNT_BACKEND_KEY'}})
        if run.returncode == 3:
            return 503, {'error': 'google_session_required'}
        if run.returncode or not output.is_file() or output.stat().st_size > 4_000_000:
            return 502, {'error': 'profile_unavailable'}
        return 200, {'profile': json.loads(output.read_text())}


class Application:
    def __init__(self, config=None, runner=run_profile, session_writer=install_session, clock=time.monotonic):
        self.config = os.environ if config is None else config
        self.runner = runner
        self.session_writer = session_writer
        self.clock = clock
        self.lock = threading.Lock()
        self.last_request = float('-inf')
        self.session_installed = False

    def state(self):
        key = self.config.get('GHUNT_API_KEY', '')
        allowed = [x.strip().casefold() for x in self.config.get('GHUNT_ALLOWED_EMAILS', '').split(',') if x.strip()]
        if len(key) < 32:
            return 'api_key_missing', []
        if not allowed or not all(valid_email(x) for x in allowed):
            return 'allowlist_missing', []
        if not session_valid(self.config.get('GHUNT_CREDENTIALS_B64', '')):
            return 'google_session_required', allowed
        return 'configured', allowed

    def __call__(self, environ, start_response):
        status, data = self.handle(environ)
        payload = json.dumps(data).encode()
        start_response(f'{status} {HTTPStatus(status).phrase}', [
            ('Content-Type', 'application/json; charset=utf-8'), ('Content-Length', str(len(payload))),
            ('Cache-Control', 'no-store'), ('X-Content-Type-Options', 'nosniff')])
        return [payload]

    def handle(self, environ):
        path, method = environ.get('PATH_INFO', ''), environ.get('REQUEST_METHOD', '')
        if path == '/health' and method == 'GET':
            return 200, {'service': 'ghunt-private-backend', 'status': 'running'}
        key = self.config.get('GHUNT_API_KEY', '')
        auth = environ.get('HTTP_AUTHORIZATION', '')
        if len(key) < 32 or not hmac.compare_digest(auth.encode(), ('Bearer ' + key).encode()):
            return 401, {'error': 'unauthorized'}
        state, allowed = self.state()
        if path == '/v1/status' and method == 'GET':
            return 200, {'state': state, 'sessionValidated': False}
        if path != '/v1/profile' or method != 'POST':
            return 404, {'error': 'not_found'}
        if environ.get('CONTENT_TYPE', '').split(';')[0].strip() != 'application/json':
            return 415, {'error': 'json_required'}
        try:
            length = int(environ.get('CONTENT_LENGTH', ''))
            if not 0 < length <= 1024:
                return 400, {'error': 'invalid_request'}
            data = json.loads(environ['wsgi.input'].read(length))
        except (ValueError, UnicodeDecodeError, TypeError):
            return 400, {'error': 'invalid_request'}
        if not isinstance(data, dict) or not valid_email(data.get('email')) or data.get('permitted') is not True:
            return 400, {'error': 'invalid_request'}
        if state == 'allowlist_missing':
            return 503, {'error': state}
        if data['email'].casefold() not in allowed:
            return 403, {'error': 'address_not_enabled'}
        if state != 'configured':
            return 503, {'error': state}
        if not self.lock.acquire(blocking=False):
            return 429, {'error': 'lookup_in_progress'}
        try:
            if self.clock() - self.last_request < 300:
                return 429, {'error': 'cooldown'}
            if not self.session_installed:
                self.session_writer(self.config['GHUNT_CREDENTIALS_B64'])
                self.session_installed = True
            self.last_request = self.clock()
            return self.runner(data['email'])
        except subprocess.TimeoutExpired:
            return 504, {'error': 'lookup_timed_out'}
        except Exception:
            return 502, {'error': 'profile_unavailable'}
        finally:
            self.lock.release()


application = Application()
