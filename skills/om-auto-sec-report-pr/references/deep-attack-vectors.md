# Attack vectors — baseline and paranoid checklist

The checklist `om-auto-sec-report-pr` walks in steps 4 (Pass A — baseline) and 5 (Pass B — deep vectors). The repository's own hotspots come from the step-3 sources (`securityChecklist`, `reviewChecklist`, `CODE_REVIEW.md`, `knowledge.sources`): where this file says "the repo's scope keys" or "the repo's guarded data-access helpers", those sources name them. For every Pass B section that applies to the unit, record an outcome: `covered`, `risk surfaced`, `not applicable`, or `inconclusive (next step)`.

## Pass A — OWASP Top 10 (2021) baseline

Apply each row to the surfaces the unit touched; the default severity is in brackets.

| Id | Category | Baseline questions |
|---|---|---|
| A01 | Broken Access Control | Server-side authentication on every new endpoint, handler, command, and job trigger; authorization checks the specific record, not just the role (no IDOR) [blocker]; every path is guarded — bulk, export, streaming, background [blocker]; granting a privilege requires a higher one [blocker]; every query on scoped data filters by the owning scope and cross-scope ids cannot be replayed [blocker]. |
| A02 | Cryptographic Failures | Sensitive fields encrypted where the repo's policy requires it; no home-rolled crypto [blocker]; passwords hashed with a slow salted algorithm [blocker]; constant-time comparison for tokens, signatures, MACs [major]; TLS verification never disabled [major]. |
| A03 | Injection | Parameterized queries — no concatenation into SQL, query DSLs, or raw ORM fragments; no shell interpolation of input; output escaped before HTML rendering; no `eval`-like sinks [blocker]. |
| A04 | Insecure Design | Fail-closed on error wherever a decision affects security or money [blocker]; limits on sizes, counts, and rates; abuse cases considered for new flows [major]. |
| A05 | Security Misconfiguration | Cookie flags, CORS, CSP, and headers preserved or deliberately changed; production profiles, not dev defaults; no default secrets [major]. |
| A06 | Vulnerable and Outdated Components | New or bumped dependencies pinned in the lockfile; no known-vulnerable or deprecated sandbox packages [major]. |
| A07 | Identification and Authentication Failures | Rate limiting or brute-force control on login, reset, invite, verify; session/token lifetime, revocation, rotation unchanged or reviewed; auth errors do not reveal account existence [major]. |
| A08 | Software and Data Integrity Failures | Deserialization restricted to safe formats and explicit schemas; write endpoints bind an allowlist of fields (no mass assignment); webhook and update integrity verified [blocker]. |
| A09 | Security Logging and Monitoring Failures | Security-relevant decisions (denied access, failed auth, privilege change, export) auditable; no secrets or personal data in logs [major]. |
| A10 | Server-Side Request Forgery | Server-side fetches of user-influenced URLs validated against an allowlist [blocker]; redirect targets from input validated [major]. |

## Pass B — deep vectors

### Access control and identity

- Wildcard / all-access grants reaching non-admin roles through menus, navigation, notification handlers, mutation guards, interceptors, or AI tools.
- Role-name spoofing — guards check permissions/features, not role names; a role rename without a permission mapping.
- Feature-flag bypass — the flag gates both the UI and the API; no ungated path when the flag is off.
- Customer/portal sessions invoking staff-only capabilities through shared endpoints.
- Session fixation and rotation — session id rotated after login, password change, MFA enrollment, privilege change.
- JWT algorithm confusion (`alg: none`, HS↔RS key swap), missing `iss`/`aud`/`exp` checks, loose clock tolerance, replay after password reset; key material never taken from attacker-controlled input.
- Step-up / sudo challenges — replayable challenges, challenge state tied to the right scope, rate-limit identifier scope.
- Signed URLs and magic links — expiry, single use, scope creep.

### Tenant and scope isolation

- The repo's scope keys (tenant, organization, account, workspace — named by the security checklist) present on every read and write path; the repo's guarded data-access helpers used instead of raw ORM calls.
- Cache keys include the scope — memory, local, and shared caches; stale entries after a scope is renamed or deleted.
- Shared in-memory registries, maps, and singletons keyed without the scope.
- Real-time channels, broadcast bridges, and event ids scoped; no bridge forwards events across scopes.
- Background jobs — the payload carries the scope, the worker refuses a mismatch, retries never replay across scopes.
- Public endpoints (acceptance links, magic links, webhook ingress) derive the scope from the signed token or URL, never from a query parameter.

### Cryptography and secrets

- Personal data encrypted at rest where the repo's declarations require it; export paths never re-emit decrypted data without policy.
- Password hashing with an adaptive algorithm (bcrypt, scrypt, argon2) at an adequate cost; never logged; constant-time compare on login.
- Signing keys rotated, key id recorded, keys not in code or committed env files.
- Timing-safe compare for signatures, tokens, and magic links — no `===` or prefix checks on secrets.
- TLS required on outbound calls; certificate verification never disabled on production paths.

### Injection and deserialization

- SQL / ORM — parameterized; no string concatenation into raw query APIs or migrations.
- Command injection — no shell execution of input; argument-array process APIs only.
- Template injection — server-side template engines (email, documents) never render attacker-controlled templates.
- XSS — unescaped HTML or markdown rendering of user input; raw-HTML escape hatches in UI frameworks.
- Prototype pollution — parsed JSON merged or spread into config objects; deep-merge and query-string parsers on attacker input; explicit rejection of `__proto__`, `constructor`, `prototype`.
- Deserialization — unsafe YAML loaders, serializer libraries that revive functions, `vm`/`Function`/`eval` sinks, dynamic `require`/import paths.
- ReDoS — user-supplied regex; catastrophic backtracking in schema regexes, email/URL/phone validators, search tokenizers, log parsers.
- Log forging — newline or control-character injection into structured logs that feed downstream parsers.

### Upload, attachment, and file handling

- Content-type decided by magic bytes, not the `Content-Type` header.
- Path traversal — reject `..`, absolute paths, null bytes, symlink escapes; canonicalize, then validate against a safe prefix.
- Archive slip — validate entry paths on extraction.
- XML — external entities and DTDs disabled, entity expansion limited.
- Image and document decoders — pixel and byte budgets against decompression bombs; parsers sandboxed, no shell-out.
- Public vs private storage partitions — scope enforced on public-partition access.

### SSRF and outbound HTTP

- Allowlist for outbound URLs (webhooks, preview fetchers, avatar loaders, OAuth metadata).
- Block private, link-local, loopback, and cloud metadata addresses (IPv4 and IPv6), and `file:`, `gopher:`, `dict:`, `data:` schemes where inappropriate.
- DNS rebinding — resolve once and pin the IP, or re-check after resolution.
- Redirect chains — bounded hops, each hop re-validated, cross-protocol redirects rejected.
- A reflected `Host` header never builds an outbound URL.

### Redirect and origin handling

- Open redirect — relative vs absolute, `//host`, protocol-relative, unicode/RTL tricks, newlines and control characters.
- CORS — no wildcard origin with credentials; exact-match origin allowlist (no suffix match); no echoing of the request origin.
- CSRF — state-changing endpoints require same-site cookies or an explicit token; no state change on `GET`.

### Webhooks and integrations

- Inbound signatures verified with timing-safe compare; secret per integration or per scope, not one global secret.
- Replay protection — timestamp window plus a nonce cache keyed by (scope, nonce), TTL aligned to allowed clock skew.
- Signature-scheme downgrade rejected once a newer scheme is expected; unsigned deliveries never accepted.
- Idempotency — unique constraint on (scope, idempotency key) or (scope, provider event id); side effects exactly once.
- Outbound webhooks — signed, secret rotation, delivery dedup, bounded retries, dead-letter audit.

### Money, stock, and workflows (when the repo has such flows)

- TOCTOU between check and commit on acceptance, reservation, fulfillment, and payment steps.
- Over-allocation on concurrent fulfillment; double credit on concurrent returns; double charge on repeated submit or refund.
- Workflow failures halt by default and stay visible; compensation on partial failure is correct.
- Money never in binary floating point; one rounding rule applied consistently; cross-currency totals require an explicit rate.

### Rate limiting and abuse

- Identifier tuple (scope, user/email, ip) — IP-only is insufficient behind a proxy; buckets survive horizontal scaling and cannot collide.
- Burst vs sustained limits match endpoint sensitivity; lockouts are time-bounded and observable; captcha or MFA fallback on suspicious thresholds.

### Cookies, headers, and CSP

- Cookie flags — `HttpOnly`, `Secure`, `SameSite=Lax` (`Strict` for admin), scoped `Path`, minimal `Domain`.
- Clickjacking — `X-Frame-Options: DENY` or `frame-ancestors 'none'` on sensitive views.
- CSP without `unsafe-inline`/`unsafe-eval`; `object-src 'none'`; `base-uri 'none'` where possible; nonces or hashes for inline scripts.
- HSTS with `includeSubDomains` and adequate `max-age`; a tight `Referrer-Policy`; `X-Content-Type-Options: nosniff`; `Permissions-Policy` for embedded device APIs.

### API hygiene

- Request schemas reject unknown keys on write operations (strict mode) — no mass assignment through permissive schemas.
- Minimal error shape — no stack traces, internal paths, or scope ids to unauthenticated callers.
- Pagination caps on list endpoints to prevent bulk exfiltration.
- Unguessable identifiers on public endpoints; sequential ids invite IDOR.
- The repo's API-contract rules (documentation exports, schema requirements) as its security checklist names them.

### AI and agent tool surfaces

- Prompt/tool injection through chat, documents, or retrieved content reaching tool calls.
- Tool authorization honors the same permission checks as the equivalent API.
- Session or tool tokens are not reused after a privilege change.

### Supply chain and dependencies

- Dependencies pinned in lockfiles; bot-driven update drift reviewed.
- No install-time scripts from untrusted packages.
- Deprecated sandbox packages removed, including transitive ones.
- Internal or scoped package names cannot be shadowed by a public registry package (dependency confusion).
- The ecosystem's audit tool output triaged.

### Observability and forensics

- Sensitive actions (login, password reset, role change, permission grant, export) logged with actor, scope, target, timestamp, origin.
- Failure paths logged, not swallowed — an empty `catch` is a red flag.
- Personal data redacted in logs where policy requires; secrets never logged (bearer tokens, API keys, private keys).

### Infrastructure and environments

- Required environment variables documented and fail closed at boot; no default secrets.
- Separate credentials per environment; no production secrets in development images.
- CORS, CSP, and cookie settings have production profiles.
- Build artifacts exclude env files, test fixtures, and demo seeds.

### Spec-specific (target is a spec)

- Every new route or command declares its authentication and permission guard, with the permission id named in the spec.
- Every new entity lists which fields are personal/encrypted and which are indexed, so exclusion policies cover sensitive columns.
- Every new event or channel is scoped by default and states its boundary.
- Every new worker declares idempotency (unique key, retry strategy).
- Every new external integration declares its allowlist and signature verification.
- A migration and backward-compatibility section exists for any change to a surface `BACKWARD_COMPATIBILITY.md` protects.
