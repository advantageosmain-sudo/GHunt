# Site work log

## 2026-09-28 10:36 America/Chicago / 15:36 UTC

- Request: merge and make the existing GHunt Site usable.
- Baseline: GHunt `master` at `5ee893929c51c7a8a665b199bbae04ce85a662b4`; private Site project `appgprj_6aba872519488191b974fbbb24ae3e1e`; the preceding Site version was an installation guide.
- Confirmed the separate Holehe PR #2 was already merged at `545837cd22e46b3a13f566daa4abcfc905550adc`.
- Added `web/` with an accessible email form, Worker backend, bounded input validation, sign-in enforcement, same-origin protection, no saved searches, an inconclusive-result state, and a ten-second best-effort backoff. Added a Web check CI workflow.
- Source evidence: `ghunt/helpers/gmail.py` implements the unauthenticated `mail/gxlu` registration signal. `ghunt/modules/email.py` requires a separate authenticated GHunt session for full profile searches.
- Validation: seven backend tests pass; browser script and built Worker syntax pass; build passes; diff whitespace passes. A direct synthetic request to Google's endpoint returned HTTP 204 without a cookie signal. The compiled Worker also completed a live synthetic lookup at 15:35:30 UTC with HTTP 200 and `no_signal`; no personal email was tested.
- Limits: the hosted registration signal is heuristic. Full profile searches remain disconnected. Browser visual QA and WebMCP execution were unavailable in this environment.
- Next action: merge after CI passes, publish the existing private Site, and verify the deployment result.

## 2026-09-28 10:40 America/Chicago / 15:40 UTC

- CI run `36445033889` passed for PR #1 head `92f94fa11dff5ee796fbd413899166c24608f408`.
- Merged PR #1 as `861ae5aa41f6f320e50770182bbb2ae56c016d57` under the owner's merge instruction.
- Site version 2 published from hosting source `5595972677a86bdec72d7b8f6f03f1946b869c5e`.
- Deployment `appgdep_6aba8a00599081919e5907583529ed4d` succeeded at 2026-09-28T15:38:54Z: https://ghunt-project-guide.mshipe2022.chatgpt.site.
- Site title updated to GHunt Email Check; access remains owner-private.
- HTML local references, anchors and form labels passed inspection. Browser visual QA, WebMCP execution, and hosted browser interaction remain unverified. The compiled Worker completed a live synthetic upstream check before publication.
- Delivered scope: basic Google registration signal. Full GHunt profile searches remain disconnected, requiring a separately authenticated session and Python runtime.
- Next action: open the private Site, enter an address you own or have permission to check, and select Check email. No installation or API key is required for this basic check.

## 2026-09-28 10:49 America/Chicago / 15:49 UTC

- Request: connect everything, including the full authenticated profile flow.
- Confirmed successful live basic lookup responses in Sites logs. The latest production environment has no backend URL or secret configured.
- Railway plugin discovery reports the app installed, but this conversation exposes no Railway account actions and no authenticated Railway CLI is available. No Railway service was created, no credentials were supplied, and no spending occurred.
- Added a Railway Docker/Gunicorn backend with exact email allowlisting, private server authentication, bounded input, isolated GHunt execution, timeout, one concurrent profile request, and five-minute cooldown. Added a server-side Site proxy and live connection status; Google credentials never pass through the browser.
- Added result sections for the email module's Google profile, Play Games, Maps, and Calendar output. Profile searches remain disabled until runtime configuration is present.
- Validation: 10 Worker tests and 7 Python backend tests pass; JavaScript syntax and build pass; Python dependencies installed in an isolated environment; GHunt profile imports pass; actual Gunicorn HTTP health and authenticated missing-session status pass. No personal account or Google session was used for testing. Docker validation is delegated to repository CI because Docker is unavailable locally.
- Remaining external actions: attach Railway to the conversation so its projects/services can be inspected, configure the shared backend secret and approved addresses, and have the owner supply a GHunt session directly to Railway's secret field. See backend/README.md.
