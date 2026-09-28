# Railway connection for the GHunt workspace

## Current connection status

The private Site, basic Google registration check, and Railway `ghunt-backend` server are live. The owner approved backend startup on the existing Railway Hobby plan on September 28, 2026 at 11:24 America/Chicago. Deployment `88624d3b-4aca-43a0-adf5-a8ba2988cb5d` succeeded at 16:26 UTC from GitHub commit `d5f74f7a5f6b4163a2ae3298f54c4e531672fa86`. The health endpoint returned HTTP 200, and an unauthenticated API request correctly returned HTTP 401. The Google session is still absent. Full-profile operation has not been validated.

Reuse the existing resources; do not create another project or service:

- Railway project: `90dd949d-a59e-4a61-b35b-ca10f6d0dfaf`
- Environment: `cb05a9f4-0fc2-4400-9c3b-00fc120021e5` (`production`)
- Service: `9b7fa99e-ca30-4503-b968-399be797cc5a` (`ghunt-backend`)
- Live backend origin: `https://ghunt-backend-production.up.railway.app`
- Private Site: https://ghunt-project-guide.mshipe2022.chatgpt.site

Sites version 3 uses runtime environment revision 1, with the backend origin and matching shared key saved. The key is stored as a secret in Sites and in Railway service variables, never in this repository. Automated Site status testing could not obtain a signed-in owner identity: the dispatcher accepted the supported Site token but the application correctly returned HTTP 401 without its authenticated-user header. Railway OAuth also withholds secret values, so direct authenticated API validation was not possible. Do not weaken authentication or ask the owner to send secrets in chat to test this. The next owner action is to open the private Site and select **Refresh connection**, then complete the Google-session steps below. Full-profile readiness remains unverified until a real authorized request succeeds.

## Deployment configuration

- Repository: `advantageosmain-sudo/GHunt`
- Branch: `master`
- Repository root: `/`
- Builder: `DOCKERFILE`; repository `Dockerfile`, configured through Railway service settings
- Start command: the image's Gunicorn command
- Health check: `/health`
- Port: injected `PORT` (8080 fallback for local use)
- Replicas: 1; Gunicorn workers: 1; threads: 4
- Sleep mode: enabled
- Restart policy: `ON_FAILURE`, maximum 3 retries
- Public URL: the generated HTTPS `*.up.railway.app` domain
- No volume is required; session refreshes live in the private container filesystem and results use temporary files deleted after the request.

Railway rejects `railway.json` / `railway.toml` for new services as of this setup. This repository therefore uses the explicit service settings above, saved through the Railway connector. Do not reintroduce the deprecated configuration file. If configuration later needs to be managed in source, use Railway's current Infrastructure as Code workflow and review its plan before applying.

GitHub source access and the Docker deployment are verified. Keep the existing source and service. The September 28 startup approval covers running this backend on the existing plan; it does not authorize upgrades, new paid products, or unrelated spending. Account credit balances remain unavailable through the connected tools. Sleep mode is enabled, but this is not a spending cap.

The `/health` response proves the server is running, not that Google authentication works. `/v1/status` requires the backend bearer key and returns one of `api_key_missing`, `allowlist_missing`, `google_session_required`, or `configured`. `configured` means session material has the expected shape, not that Google has accepted it.

## Runtime variables

| Platform | Variable | Value |
| --- | --- | --- |
| Railway | `GHUNT_API_KEY` | A newly generated random secret, at least 32 characters. |
| Railway | `GHUNT_ALLOWED_EMAILS` | Comma-separated exact addresses the owner is authorized to check. |
| Railway | `GHUNT_CREDENTIALS_B64` | Exact contents of an existing GHunt `creds.m` session file. This file is already base64; do not encode it again. |
| Sites | `GHUNT_BACKEND_URL` | Exact generated HTTPS Railway origin, without a path or query. |
| Sites | `GHUNT_BACKEND_KEY` | Same secret as `GHUNT_API_KEY`, marked secret in Sites. |

Generate the shared key with a secure random generator. Transfer it directly into the two platforms' secret fields; do not commit it, put it in a URL, or send it in chat. Railway owns the service variables. Sites variables must be set with the Sites runtime configuration tool, followed by a deployment so they take effect. The browser never sees the shared key.

## Google login: owner-only step

Only the owner can complete the Google login. Never request Google passwords, cookies, or session contents in chat.

If GHunt is not already installed on a trusted computer:

1. Install Python 3.10 or newer from https://www.python.org/downloads/ using the installer appropriate to that computer. On Windows, enable the installer's **Add python.exe to PATH** option before installing. If Windows S Mode prevents the installation, stop at that restriction; do not change device security settings without the owner's choice.
2. Open a terminal and run `python -m pip install pipx`.
3. Run `python -m pipx ensurepath`, close the terminal, and open it again.
4. Run `pipx install ghunt`.
5. Install the GHunt Companion extension using the official store links in the repository README.
6. Run `ghunt login` and choose the Companion method. Complete the Google login yourself, then let Companion finish the GHunt login flow. Stop if Google refuses authentication; do not bypass its checks.
7. Find the newly generated session at `<your-user-home>/.malfrats/ghunt/creds.m`. On Windows this is normally `%USERPROFILE%\.malfrats\ghunt\creds.m`.
8. In the correct Railway service, open **Variables**. Create `GHUNT_CREDENTIALS_B64` and paste the contents of that local file directly into its secret value field. Do not paste it into ChatGPT, GitHub, or the public Site.
9. Apply the staged Railway variables and deploy. Refresh the profile connection in the private Site.

The token grants access to the associated Google session. Keep the service and Site owner-private. Rotate or remove `GHUNT_CREDENTIALS_B64` if that session is revoked or should no longer be used.

## First live validation after connection

1. Confirm the Railway deployment is healthy and its `/health` response is successful.
2. Have the operator call `/v1/status` using the server secret without printing it. Confirm `configured` and keep `sessionValidated` false until an actual profile request succeeds.
3. Open the private Site and select **Refresh connection**.
4. Select **Full profile, Maps & Calendar** only once enabled.
5. Enter an address explicitly included in `GHUNT_ALLOWED_EMAILS` that you own or have permission to check, confirm the permission box, and submit.
6. Confirm the real response appears. A missing, expired, blocked, or invalid Google session must produce an error; do not record a successful integration on configuration alone.
7. Confirm an address outside the allowlist is rejected and an unauthenticated request to the backend is rejected. Inspect errors without logging the session, address, or response contents.

## Local checks

```sh
python -m unittest backend.test_app -v
python -m compileall -q backend
node --test web/test-worker.mjs
node web/build.mjs
docker build -t ghunt-private-backend .
```

Existing upstream dependency ranges are preserved. Gunicorn is pinned in `backend/requirements.txt`; the container installs the repository package through its existing build metadata. CI builds the same Dockerfile.

## Boundaries

The backend has no browser CORS access. The Site's Worker forwards requests over HTTPS with the server secret. The backend requires an exact address allowlist, permission acknowledgement, bounded JSON, one profile job at a time, and a five-minute interval. Only the email-profile module is exposed; arbitrary shell commands, Drive file IDs, Wi-Fi location searches, and general-purpose URL fetching are not exposed. Session creation is not served through a public login endpoint.

Sources for Railway configuration: https://docs.railway.com/services, https://docs.railway.com/deployments/healthchecks, https://docs.railway.com/variables, and https://docs.railway.com/infrastructure-as-code#migrating-from-config-as-code.
