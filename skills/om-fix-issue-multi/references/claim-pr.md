# Claim handling

## om-fix-issue-multi specifics

This staged role opens no PR claim. Issue runs invoke `om-fix` for claim acquisition and use the base `om-fix-issue` workflow for hold, abort, and release through named tracker operations. Aliases and the internal runtime never take independent claims.
