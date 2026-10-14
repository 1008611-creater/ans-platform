# Independent review evidence

Reviewed local task branch only; no commit, production database write, external publication or deployment.

- Final migration SHA-256: 813d290150b97c3c5b3b9a37f4a052313c4524f1e19e98ab059cb87bb486a643
- Fresh PostgreSQL 18 instance: loopback port 55449; guarded disposable database ans_agri_wall_verify_20261015, outside the repository.
- All checked-in migrations applied from an empty database, including the final three-table migration.
- 14 real-service integration cases passed. Coverage includes unbound formal-submission refusal, manager/seller authority, concurrent idempotent binding, free private external-project import, over-100 catalog visibility, accepted formal submission and immutable roster, category/price/identity guards, explicit future window, pre-window Star confirmation, duplicate/cancel/self-team voting, start locking, actual insert crossing the deadline, pre-first-read eligibility and team-name mutations, persisted tie winners, post-deadline unstar/withdrawal, and a zero-vote candidate with no award.
- Extra database guards passed: changing artifact workflow identity cannot bypass immutable imported versions; missing listing payload fields cannot bypass wall classification.
- Integration and browser-fixture script TypeScript checks passed. A fresh synthetic browser fixture is ready; browser evidence is recorded separately by the root agent.
- Schema comparison found no drift referencing wall/popularity tables. Existing drift in unrelated baseline modules remains; this is not a claim that the entire repository schema has zero drift.

Review found and implementation corrected: UTF-8 BOM migration failure; Prisma one-to-one composite uniqueness; lazy deadline freeze vulnerable to later eligibility changes; missing SQL fields with three-valued NULL comparisons; artifact identity bypass; and recoverable NOWAIT lock conflicts.

Product-copy review completed: both locales now accurately exclude the seller, active team members and official entrants, and explicitly state that opening voting locks new bindings.

Evidence: .workbuddy/evidence/agri-wall/integration-report.json, migrations.log, guard-extra.log, schema-diff.sql and script-types.log. These local evidence and fixture files are ignored; no credentials are included in this report.

## Final root integration review

Read-only review completed for explore discovery and submission pages, the shared listing editor, catalog assembly, wall/submission contracts, stage wall projection and imported-version preselection. No new unresolved privacy, permission or submission-bypass issue was found in these changes. Public discovery reads only reviewed listing snapshots; the stage wall projection is limited to authorized team members; writes retain seller/team-manager, project/version ownership and same-edition checks. URL-selected teams are constrained to the actor's real entries. Account boundaries abort stale-account requests and suppress stale acknowledgements.

Unbound published projects use their valid marketplace preview route; confirmed wall entries still enter the catalog independently of its ordinary 100-listing limit. The event publishing shell uses free project language, and bound listing category/price changes remain enforced by the backend. Imported versions are preselected only within the bound project, and formal submission still rechecks the server wall gate.

The additional HTTP report was inspected: seven real credentials/CSRF, publication, authorization, origin and Star retry cases passed. Root separately reports browser completion of wall binding, imported-version selection and accepted formal-submission history. These browser and final build observations are owned by root; this report does not turn a local check into a production result.
