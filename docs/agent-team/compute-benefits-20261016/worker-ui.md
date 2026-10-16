# Compute benefits UI implementation

Local implementation only; no production change, submission, approval, purchase, real grant issuance or upstream call was performed.

- Owner-bound `/workspace/benefits` questionnaire, application status and grant history. `/workspace/credits` integration is coordinated with root. Flag-off server pages return not found and credits entry is hidden; client reads are not mounted when disabled.
- Grant cards show true total, used, held, available, source, expiry, status and model list. Gift dollars stay separate from paid points. Exact microdollar formatting uses BigInt constructors without floating-point balances.
- Onboarding questionnaire covers role, AI experience, intended Agent and intended use. Registration application covers team/personal name, project name, problem and delivery plan. Pending/approved applications are read-only; rejected applications can amend prefilled answers and resubmit.
- API instructions link to existing personal Key settings, accurately state the current single active Key/rotation/revocation behavior, and explain auto/gift/paid funding. Terra and Opus remain marked unavailable pending their required acceptance.
- Admin page requires active USERS_MANAGE and AccountContentBoundary. Review sends exact revision/decision/note; server owns amount and grant policy.
- Private components unmount on account change. Requests include actor header, writes JSON, same-origin endpoints, AbortController, timeout and stale/unmount guards.
- All new user-facing text is in product.computeBenefits (zh/en); vouchers.apiGiftFunding added for root history integration. Windows pipeline encoding issue was fixed by explicit UTF-8 rewrite; no ??? corruption remains in new namespace.

Verification: targeted ESLint passed on both components, both new pages and the focused UI test. Eight focused UI tests prepared (exact decimal formatting, real owner grants, blocked route labels, idempotent click guard, account change abort, rejected edit, load/disabled distinction and revision-bound review). Execution initially hit sandbox spawn EPERM; escalation wait was interrupted without a result. Root is running the final focused suite and typecheck centrally. No full-suite or live browser claims are made here.

Review findings fixed: rejected resubmission, broken separators, registration anchor, current single-Key copy, tests using translation keys and stable router mock, duplicate role form selector ambiguity.
