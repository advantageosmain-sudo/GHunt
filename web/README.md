# GHunt private email workspace

A browser form and Cloudflare Worker backend for the registration signal implemented by `ghunt/helpers/gmail.py`. Canonical source lives in this repository's `web/` directory. The existing private ChatGPT Site receives a copy of these files; it is the hosting destination.

## Use the site

1. Open https://ghunt-project-guide.mshipe2022.chatgpt.site while signed in to the owning ChatGPT account.
2. Enter your email address, or an address you have permission to check.
3. Check the permission box.
4. Select **Check email**.
5. Read the result. **No account signal returned** is inconclusive, not proof that an account is absent.
6. Select **Clear result** to clear the address and result from the page.

No API key, Google cookies, payment account, or app installation is required for this basic check. Addresses are sent to Google's `mail/gxlu` endpoint. The application does not store searches, write addresses to logs, or set cookies. The hosting provider and Google have their own operational logging policies.

## Capability limits

The basic registration check works without a separate backend. The full email-profile flow now has a protected Railway backend and Site proxy, but it remains disabled until that backend and an authenticated GHunt session are configured. The interface shows connection status and exposes returned Google profile, Maps, Calendar, and Play Games sections after a successful profile request. See `backend/README.md` in the canonical repository for connection steps. Do not ask users to paste Google cookies into the site or chat.

Only a 204 response is interpreted as a registration signal. Redirects, blocking, rate limits, other response codes, and timeouts return an unavailable result. Presence of `Set-Cookie` is a heuristic inherited from GHunt; this is not an official verification API and may change. No-signal results remain explicitly inconclusive.

## Development and checks

Use Node.js 22 or newer. The web app has no external runtime or build packages.

```sh
node --check web/app.js
node --test web/test-worker.mjs
node web/build.mjs
node --check web/dist/server/index.js
```

`build.mjs` creates one ESM Worker with a default object exporting `fetch`. The Worker embeds the HTML, CSS, JavaScript, and license, so no asset binding is needed. The web build does not modify the Python package.

Routes: `GET /`, `GET /app.js`, `GET /style.css`, `GET /license.txt`, `GET /api/status`, `POST /api/lookup`, and `POST /api/profile`. The POST body is `{ "email": "test@example.invalid", "permitted": true }`. The profile endpoint additionally requires a configured backend and an address on its allowlist.

## Authentication and security

Private Sites access restricts viewers to the owner. Every route also requires the trusted dispatcher header `oai-authenticated-user-id`. These headers are trusted only behind the Sites dispatcher; do not expose this handler directly on an unauthenticated server. POST checks the exact site origin, JSON content type, 1024-byte request bound, email syntax, and the permission acknowledgement. Cookie headers from Google are never forwarded. The ten-second per-isolate backoff is best effort, not a globally durable rate limit. No public deployment is supported by this configuration.

Basic-check runtime variables: none. The profile proxy uses `GHUNT_BACKEND_URL` and secret `GHUNT_BACKEND_KEY`. Only HTTPS Railway origins are accepted. `SITE_ORIGIN` must match the exact registered Site URL; update it if the origin changes.

## Publishing to the existing private Site

Open the Site using the Sites hosting workflow, preserving project ID `appgprj_6aba872519488191b974fbbb24ae3e1e`. Copy the contents of `web/` except its generated `dist/` into that checkout. Keep its `.git` and project ID. Remove `static` from `.openai/hosting.json` because this version includes a Worker. Run the tests and build above with the `web/` prefix removed, save the exact source commit and generated archive, and deploy through Sites with owner-only access. Do not expose the Worker directly or broaden sharing.

License: AGPL-3.0. The registration method is adapted from the upstream GHunt project by mxrch. The interface links to the public source and license.
