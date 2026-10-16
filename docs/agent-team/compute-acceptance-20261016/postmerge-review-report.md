# Post-merge integration independent review

Date: 2026-10-16. Reviewer: postmerge_budget_review. Result: **PASS; no open P1/P2 findings in this increment**.

## Reviewed identity and scope

- Branch: `codex/compute-integration-regressions-20261016`.
- Exact baseline: `14670c66c455b5a3269ec8e4b102ed5159696882`.
- Exact frozen `git diff --binary HEAD` SHA256: `9147f4d000ead82e16f224a61d2f8c6b24a19b546c83247b0b6a46a595890e86`.
- Requirements: REQ-012 through REQ-014; acceptance AC-012 through AC-014.
- Two runtime files, three test files and two task records. Read-only review of supporting gateway, billing policy, companion service, model-client, account boundary and API route behavior; no implementation edits.
- This report is additional review evidence and is excluded from the already frozen implementation diff.

## Findings and reasoning

1. Agent ticket cap now calls the same `readModelBillingSnapshot` and `reserveModelPoints` conversion used by `validateCodexPayload`. Its one-call envelope is the payload byte ceiling plus gateway headroom, multiplied by the bounded three-call limit in integer micro-points. Under the explicit denomination-1 fixture, Sol's cap is 2.84619 points. Actual checked payload reserves cannot exceed one third of that signed cap; accumulated reservations are separately limited by the original ticket. No eager module-import pricing read remains.
2. Missing or malformed current model billing configuration rejects a new quote. A changed computed cap rejects ticket execution; verification never substitutes a new cap into a signed ticket. Status verification omits current-price lookup, remains authenticated/account-scoped, and does not start supplier calls. The gateway enforces its own freshly parsed reserve against the explicit caller cap, providing a second boundary if configuration changes between checks.
3. API Key mutation retains the actor header, unmount abort, timeout, single-flight guard and late-response liveness check, with explicit `cache: no-store` and `credentials: same-origin`. The unchanged route independently checks same-origin and current actor before a write. An account switch destroys the private component state and aborts its pending operation.
4. Replacing the two legacy APIC success expectations matches the actual production `METERED_ACCOUNT_REQUIRED` guard when unified billing is disabled. The updated tests assert no supplier fetch; the template path also verifies release of its existing hold. They do not re-enable a bypass.
5. The durable template fixture now supplies separate authoritative raw-quota evidence and settled request rows. Runtime code reads only VERIFIED evidence selected in the database query and leaves absent quota absent rather than fabricating it from member points. The fixture does not imply that its raw quota and member points share a unit.

## Independent verification

Command: `node node_modules/vitest/vitest.mjs run src/__tests__/lib/companion-agent.test.ts src/__tests__/lib/run-service.test.ts src/__tests__/lib/workflow-runner.test.ts src/__tests__/lib/model-billing-policy.test.ts src/__tests__/components/api-key-settings-safety.test.tsx src/__tests__/api/user-api-key.test.ts`

Result: **6 files / 154 tests passed**. This review selection includes API route tests; it is not the implementer's different 6-file/137-test selection and these counts must not be added together.

Targeted ESLint: **0 errors** across the five changed TS/TSX files. One existing unused-variable warning remains at `src/__tests__/lib/run-service.test.ts:172`, outside this diff. Implementation owner separately reported complete `npm run lint` passing with 0 errors/411 warnings and `tsc -p tsconfig.json --noEmit --incremental false` passing on this same frozen source. These are owner-provided execution results, not independent reruns. No full build or historical migration rerun was required for this bounded increment.

No production, upstream, real model, wallet, credential, payment, migration, merge or deployment operation was performed. Mocked/unit checks do not prove production configuration or live model interoperability.

## Frozen source hashes (raw file bytes)

| File | SHA256 |
| --- | --- |
| `docs/agent-team/compute-acceptance-20261016/task-spec.md` | `0ad1ec4effd6bec29b11c022ab1a1fa85e62e7825da198342c0d6a93931547ee` |
| `docs/agent-team/compute-acceptance-20261016/worker-root.md` | `1e8fb2b7a22de9a575429f10334cbf467cef371a7513d55e39f3adae57397258` |
| `src/__tests__/lib/companion-agent.test.ts` | `2dea1c708522b70f8b3de4f01bc135a6b9bf7877fc4a3d38c2faa427dd1ec5de` |
| `src/__tests__/lib/run-service.test.ts` | `6226da3ca476dbe154b9d01e34f9cfe87ca897780d8b8a8e37f648da9dd0f28d` |
| `src/__tests__/lib/workflow-runner.test.ts` | `981206c8bfd13c14e4d57f6586df66be65bf83dad261d1d3dda7f176e98d34f0` |
| `src/components/settings/api-key-settings.tsx` | `e1b773d8ad8939eb3dcef28314dbbd5be02cc47b98f9777c6046d9214ae553a3` |
| `src/server/companion/policy.ts` | `a10be21870b9569897eb3c9409d5c8617b67d58b3a8f0643b217edd25e3415e5` |
