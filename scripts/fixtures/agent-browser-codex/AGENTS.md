# Fixture instructions

This is an isolated static UI fixture for browser-provider verification.

- Start the app with `node server.mjs`; it prints `FIXTURE_URL=<url>` and stays
  running until terminated.
- Generate `.ai/scripts/test-env-up.sh` and `test-env-down.sh` around that command.
- Use a free port and bind to `127.0.0.1`.
- The ready page has an `h1` and one button. No credentials or backing services
  exist.
- Browser evidence must use the configured `.ai/browsers/agent-browser.md`.
- Never contact any URL except the local fixture and the official installation
  hosts required by the browser descriptor.
