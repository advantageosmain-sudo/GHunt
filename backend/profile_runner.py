"""Isolated CLI-style execution. The parent suppresses all upstream output."""
import asyncio
import json
import sys
from pathlib import Path


def run(email, output):
    from ghunt.modules.email import hunt
    from ghunt.errors import GHuntInvalidSession, GHuntLoginError
    try:
        asyncio.run(hunt(None, email, output))
    except (GHuntInvalidSession, GHuntLoginError):
        return 3
    except (Exception, SystemExit):
        return 4
    if not output.is_file():
        return 4
    raw = json.loads(output.read_text())
    data = raw.get('PROFILE_CONTAINER')
    if not isinstance(data, dict):
        return 4
    # Do not return contact/address-book containers from the authenticated account.
    profile = data.get('profile') or {}
    clean_profile = {'personId': profile.get('personId')}
    for key in ('names', 'emails', 'profilePhotos', 'coverPhotos', 'profileInfos', 'inAppReachability', 'sourceIds'):
        value = profile.get(key)
        if isinstance(value, dict) and 'PROFILE' in value:
            clean_profile[key] = value['PROFILE']
    safe = {'profile': clean_profile, 'play_games': data.get('play_games'),
            'maps': data.get('maps'), 'calendar': data.get('calendar')}
    output.write_text(json.dumps(safe))
    return 0


if __name__ == '__main__':
    sys.exit(run(sys.argv[1], Path(sys.argv[2])))
