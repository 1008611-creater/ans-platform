# PR handoff — 2026-10-16

The user authorized committing, pushing and opening this PR for another thread to continue. This authorization does not include merging, production deployment or additional paid calls. The branch preserves the reviewed local candidate based on 9ceb01645020a1d172adb958476285f192135bb1; integration with the moving main branch remains a separate step. No production changes were made.

## Final approved policy

- Paid denomination: CNY1 = USD1 model credit = 10 ANS points; GPT multiplier0.16, DeepSeek/Opus1. The previous6.7 conversion was revoked.
- Questionnaire: one DeepSeek USD1000 grant per account. Approved agriculture hackathon registration: Terra300, shared Astra/Sol200 and Opus100 USD. Each grant expires720 hours after issuance.
- Grants consume official USD cost1:1, separately from paid points. Existing matched grants that expire or run short cannot silently charge paid points. Explicit funding selection is documented in the implementation guide.
- Terra remains unavailable until the exact McGrox free-group credential and receipt path are verified. Opus remains behind the existing protocol and billing activation gates.

## Verification and boundaries

- Existing independent source reviews are retained in the two task directories. The combined106-file reviewed source set matches the frozen hashes; no review was rerun merely to prepare this PR.
- Relevant benefit regression:10 files/135 tests passed. Final backend increment:38 tests passed; these counts overlap and are not additive.
- Final full application TypeScript check and targeted ESLint passed. Full npm run lint from the byte-matched isolated build copy passed with0 errors and410 warnings. The original worktree npm shim could not locate eslint; dependencies were not modified.
- Isolated PostgreSQL:93 migrations and8 assertion groups passed. No production data was copied.
- Full production build passed: BUILD yQ3RI3rBVEXfZXjKbbm1h. Reviewed runtime/message/migration files match that build copy byte-for-byte. This is a local build, not a release.
- Authenticated isolated-browser flow passed: questionnaire → DeepSeek1000; registration → admin approval → Terra300/sharedGPT200/Opus100; original25 paid points unchanged. No provider calls or real grants. Owner-checked temporary database removed and preview port3192 closed.
- Staged content was checked for private keys, common provider/GitHub token formats and credential-bearing database URLs; none found. No .env, real credentials, live databases or redeemable vouchers are included.
- Real Claude Code/APIC receipt end-to-end, provider streaming/tools, real-wallet concurrency and production acceptance remain unverified. Do not activate models solely because their grant cards render.

## Integration and rollout notes

This branch includes two forward-only billing/benefit migrations and the prerequisite compute-center/API-key/model-plaza fixes. Retain existing main changes when resolving overlaps, particularly translations and the agriculture event landing page. Revalidate only changed integration surfaces; the recorded local checks do not certify an integrated main candidate.

Enable the benefits feature only after compatible migrations, explicit billing snapshots and the configured real competition/registration window are present. Disable new billing/benefit admission before application rollback; preserve forward-compatible database constraints and recovery for pending requests. Do not roll back to code that cannot settle v2 requests, delete accounting evidence or rerun historical migrations.

Evidence screenshots and detailed execution logs remain outside Git under evidence/ans-compute-acceptance-20261016; review reports and synthetic migration receipts are included here. Continue via this PR; no message was sent to another chat.
