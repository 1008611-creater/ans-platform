# AgriHackathon wall and ANS Star award

Confirmed 2026-10-15. External projects may enter; every official entry must publish a reviewed free project in competition/agri-wall. Popularity uses ANS Stars, independently of jury scoring. User authorizes three new tables and isolated migration/integration verification. No commit, push, PR, production migration, public rules activation or deployment is authorized.

- REQ-01 / AC-01: A discoverable wall category and event links display only reviewed, published, edition-linked projects, independent of the general marketplace 100-row limit.
- REQ-02 / AC-02: Team managers link their own free published external project; import its public description into a private stable Project and version. No AI call or payment; retries do not duplicate projects. No private facts are published.
- REQ-03 / AC-03: Formal submission and corrections validate edition/team/wall/project identity, public status and synchronized publication version. Existing formal roster and submission history are preserved.
- REQ-04 / AC-04: RULES_CONFIRM configures an explicit future window with revision control. Within the window, desired-state ANS Star and valid votes update atomically. Pre-window Stars require explicit confirmation; self/team/flagged/deleted account votes are excluded.
- REQ-05 / AC-05: DB time controls cutoff. At first read/write after deadline, results are durably sealed; later ordinary Star changes cannot alter them. Tied leaders share the award; all zero means no winner. Withdrawal immediately hides listing and stops eligibility; submitted history remains.
- REQ-06 / AC-06: Complete publish/review/link/formal-submit flow, account-switch isolation, clear loading/empty/error feedback, accessible responsive Chinese/English UI and organizer configuration.
- RULE-AUTH-01: No global ADMIN bypass for event scope. Do not change authentication or payment.
- RULE-DATA-01: Three tables: wall entries, popularity rounds, popularity votes; keep old tables/data. Validate new migration only against an isolated database.
- Verification: targeted unit/component checks, real isolated PostgreSQL migration and transaction checks, types/lint/build, desktop/mobile browser verification, independent review and issue closure.

Follow-up authorization on 2026-10-15: commit and push this task branch, create a GitHub PR, and complete applicable review/check fixes. Merge, production migration and deployment remain outside scope.
