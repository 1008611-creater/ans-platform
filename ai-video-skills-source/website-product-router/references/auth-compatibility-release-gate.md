# Authentication Compatibility And Release Gate

Use this gate when a website has login, registration, email/SMS codes, password reset, migrated accounts, a legacy UI, compatibility APIs, or a self-hosted/container release. Authentication is a critical journey, not a generic form smoke.

## Correct Operating Path

A correct release must preserve one continuous contract:

```text
visible auth page
→ deployed browser asset and cache version
→ intended same-origin API route
→ request schema and CSRF/Origin checks
→ rate limit and invitation/account eligibility
→ database/password/code transaction
→ email/SMS delivery when required
→ session cookie issuance
→ authenticated destination reload
→ session readback and logout/reset recovery
```

Do not accept a green homepage, `/health`, configured SMTP variables, or a successful image build as proof that this path works.

## 1. Legacy UI And API Compatibility Contract

Before launch, inventory every auth action exposed by every still-reachable UI. Record at least:

| UI action | Browser path | API path | payload | response/cookie | destination |
| --- | --- | --- | --- | --- | --- |
| Login | `/login` | canonical login endpoint | account + password | session + CSRF cookies | authenticated product route |
| Registration code | invitation registration page | canonical code endpoint | email + invitation proof | cooldown/result | same form |
| Register | invitation registration page | canonical register endpoint | invitation + code + terms + password | session cookies | authenticated product route |
| Reset | account recovery page | canonical reset endpoints | email + code + new password | reset result | login/product route |
| Logout | authenticated shell | canonical logout endpoint | CSRF-protected request | revoked session | public/login route |

Hard rules:

- A legacy page must not call a catch-all compatibility proxy unless the required upstream is configured and actively verified.
- Prefer a bounded local compatibility handler or an explicit redirect to the canonical flow over an implicit proxy to an absent old system.
- Verify the JavaScript actually served by the public URL, including its cache-busting release ID. Source inspection alone is insufficient.
- After login, do not call an old session bootstrap that can overwrite the newly issued session with `null` or stale user data.
- Registration policy must remain explicit. If registration is invite-only, an old open-registration form must route to the invite flow rather than silently bypassing invitation or terms consent.
- Compatibility responses must preserve status, public error code, `Set-Cookie`, CSRF, and redirect behavior. A generic `502` is not an acceptable user-facing compatibility result.

## 2. Migrated Password And Account Contract

Login validation and new-password validation are different contracts:

- Login must accept every password shape that can exist in the migrated database and then verify the stored hash.
- Registration, password reset, and password change may enforce the new stronger minimum.
- Do not raise the login schema minimum above the historical password minimum unless all affected users have been forced through a verified reset campaign.
- Preserve supported legacy password hashes until users successfully authenticate and an intentional rehash path runs.
- Add regression tests proving that the shortest valid migrated password reaches hash verification while the same weak password remains rejected for new registration/reset.
- An existing account attempting registration should receive an account-exists/recovery path, not a delivery proxy error.

## 3. Verification-Code Delivery Contract

`emailConfigured: true` proves only that variables exist. Delivery readiness requires an active transport check appropriate to the environment.

The code-delivery path must:

1. validate same-origin/CSRF and rate limits;
2. validate invitation or reset eligibility before sending;
3. create the pending code transactionally or with a compensating delete;
4. send through the configured transport with bounded connection, greeting, and socket timeouts;
5. mark delivery only after the provider accepts the message;
6. remove or invalidate an undelivered pending code;
7. return stable public errors without SMTP credentials or provider detail;
8. enforce resend cooldown and maximum attempts.

A real inbox delivery test changes external state. Run it only with an explicitly authorized test recipient and record the time, purpose, result, and cleanup/expiry boundary.

## 4. Cross-Platform Next.js Container Gate

When the source/build host and production host differ, treat the artifact as platform-sensitive.

Known failure pattern:

- Next.js standalone output built on Windows can contain junctions or platform-specific external-module aliases.
- Docker COPY may preserve an empty alias directory instead of dereferencing the Windows junction.
- Prisma generated on Windows may lack the Linux query engine even when `next build` succeeds.
- The container can start and serve a page while `/health`, `/readiness`, or auth fails only when the route imports AWS SDK, Prisma, Sharp, or another native/external module.

Required controls:

- Prefer building the final runtime artifact on Linux or in the same Linux image family as production.
- If promoting a Windows-built Next.js standalone overlay, explicitly enumerate and verify every reparse-point/junction dependency.
- Reuse native dependencies only from a known-good Linux base image with matching package versions.
- Verify expected external alias paths such as traced AWS SDK/Prisma modules inside the candidate container.
- Verify Prisma has the production runtime engine (`debian-openssl-*` or the actual target), not only a generated client directory.
- Do not replace a known-good runtime wholesale for a small UI/auth patch when a minimal, immutable server/static overlay is sufficient.
- Give every candidate a unique image tag. Never overwrite the rollback tag.

## 5. Mandatory Candidate Preview

Before changing public traffic, run the candidate on the production host or an equivalent Linux host using:

- the real container network;
- the same environment-variable names without printing their values;
- a loopback-only preview port;
- the real database/Redis/object-storage/SMTP readiness checks where safe;
- no DNS change and no unrelated service restart.

The candidate must pass:

1. Docker health becomes `healthy` within the declared window.
2. `/health` returns `200`.
3. `/readiness` returns ready for every required dependency.
4. Logs contain no missing external module, missing native library, wrong Prisma engine, migration, or connection-contract errors.
5. The public/preview login page serves the intended release-versioned browser asset.
6. A bounded invalid-credential probe reaches authentication and returns the expected auth response (`400/401/429` by contract), never proxy `502` or application `500`.
7. Registration reaches the canonical invite/open-registration route by policy.
8. Login success, session readback, destination reload, logout, reset, and code delivery are exercised with an authorized QA account before opening real users.

Do not use a real user password in automated verification. A structural invalid-credential probe proves routing and schema reachability; a separately authorized QA account proves successful session behavior.

## 6. Promotion, Rollback, And Stop Conditions

Promote only the application service in scope. Do not restart Worker, database, Redis, object storage, ingress, or unrelated services for an auth/frontend release.

Immediately stop and restore the previous application image when any of these occurs:

- Docker health stays `starting`/`unhealthy` beyond the release window;
- `/health` or `/readiness` fails;
- logs show missing modules, wrong native runtime, or Prisma engine mismatch;
- login/code/register/reset returns `502` or `500` for a normal bounded request;
- session cookies are absent, rejected, or overwritten after login;
- a non-invited user can bypass invitation or required terms;
- the public page still serves the old browser asset after promotion;
- any user can observe another user's identity or session.

Rollback restores the prior application image/config first. Do not restore or rewrite database data for an application-only failure.

## 7. Required Evidence Record

For each auth-affecting release, record:

- release/image ID and source snapshot;
- prior image/config and rollback command/file;
- auth compatibility matrix;
- migrated password policy and regression-test result;
- browser asset URL/version observed publicly;
- Linux candidate health/readiness and log scan;
- bounded invalid-credential probe status;
- authorized successful-login/session/logout result or explicit `not_verified`;
- authorized real code-delivery result or explicit `not_verified`;
- production health/readiness after promotion;
- monitoring window and stop-condition owner.

## Anti-Regression Example

If both login and “send code” return `502` while `/health` is green, first compare the visible page's API paths with the canonical auth paths and inspect the compatibility proxy's required upstream. Do not rotate SMTP credentials first. A shared proxy failure before authentication explains multiple `502` actions; SMTP failure alone does not explain password login failing.
