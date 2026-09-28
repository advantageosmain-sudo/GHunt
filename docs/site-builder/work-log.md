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
