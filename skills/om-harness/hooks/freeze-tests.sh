#!/usr/bin/env bash
# Compatibility entrypoint; Node is already required by the harness runtime.
exec node "$(dirname "$0")/guard.mjs" freeze
