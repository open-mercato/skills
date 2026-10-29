#!/usr/bin/env bash
# Compatibility entrypoint. Host permissions remain the publication boundary.
exec node "$(dirname "$0")/guard.mjs" block
