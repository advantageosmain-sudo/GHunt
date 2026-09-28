import base64
import io
import json
import subprocess
import unittest
from backend.app import Application, session_valid

TOKEN = 'fixture-' + 'x' * 40
SESSION = base64.b64encode(json.dumps({'cookies': {'example': 'fixture'}, 'osids': {'example': 'fixture'}, 'android': {'master_token': 'fixture', 'authorization_tokens': {}}}).encode()).decode()


class BackendTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        self.config = {'GHUNT_API_KEY': TOKEN, 'GHUNT_ALLOWED_EMAILS': 'owner@example.invalid', 'GHUNT_CREDENTIALS_B64': SESSION}
        self.app = Application(self.config, runner=self.fake_profile, session_writer=lambda x: None)

    def fake_profile(self, email):
        self.calls.append(email)
        return 200, {'profile': {'profile': {'personId': 'fixture'}}}

    def request(self, path='/v1/profile', data=None, key=TOKEN, method='POST'):
        body = json.dumps(data if data is not None else {'email': 'owner@example.invalid', 'permitted': True}).encode()
        env = {'PATH_INFO': path, 'REQUEST_METHOD': method, 'HTTP_AUTHORIZATION': 'Bearer ' + key, 'CONTENT_TYPE': 'application/json', 'CONTENT_LENGTH': str(len(body)), 'wsgi.input': io.BytesIO(body)}
        return self.app.handle(env)

    def test_health_contains_no_session_details(self):
        self.assertEqual(self.request('/health', key='', method='GET')[0], 200)
        self.assertNotIn(SESSION, str(self.request('/health', key='', method='GET')))

    def test_auth_and_allowlist_fail_closed(self):
        self.assertEqual(self.request(key='wrong')[0], 401)
        self.assertEqual(self.request(data={'email': 'other@example.invalid', 'permitted': True})[0], 403)
        self.assertFalse(self.calls)

    def test_requires_valid_session_and_consent(self):
        self.assertEqual(self.request(data={'email': 'owner@example.invalid', 'permitted': False})[0], 400)
        self.config['GHUNT_CREDENTIALS_B64'] = ''
        self.assertEqual(self.request()[0], 503)
        self.assertFalse(self.calls)

    def test_success_then_cooldown(self):
        self.assertEqual(self.request()[0], 200)
        self.assertEqual(self.request()[0], 429)
        self.assertEqual(self.calls, ['owner@example.invalid'])

    def test_oversized_request(self):
        self.assertEqual(self.request(data={'email': 'x' * 2000})[0], 400)

    def test_timeout_has_no_sensitive_diagnostics(self):
        def timeout(email): raise subprocess.TimeoutExpired('private detail', 75)
        self.app.runner = timeout
        self.assertEqual(self.request(), (504, {'error': 'lookup_timed_out'}))

    def test_status_does_not_claim_session_validated(self):
        code, data = self.request('/v1/status', method='GET')
        self.assertEqual(code, 200)
        self.assertEqual(data, {'state': 'configured', 'sessionValidated': False})
        self.assertFalse(session_valid('invalid'))
        self.assertFalse(session_valid(base64.b64encode(b'null').decode()))


if __name__ == '__main__':
    unittest.main()
