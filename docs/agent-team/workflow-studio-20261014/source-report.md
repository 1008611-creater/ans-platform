# Source and discovery implementation report

Scope: project-to-workflow entry, public source prefill, public catalog and Hub member workflow visual projection. Included by the root agent in c8b856f6. No independent submission or deployment performed.

## Delivered

- Public project detail adds a secondary `/workflows/new?project=<slug>` entry.
- New-workflow page reads the current server public catalog, preserves the project query through sign-in, and distinguishes withdrawn/unknown sources from unavailable catalog reads.
- Public title/input/output/source reference material pre-fills a private author draft. The initial runner produces a production-plan document, not the original project's external executable or promised original artifact. Source template delimiters are neutralized; the author's real topic remains the only input variable. No automatic external code execution, publication, or user-input persistence was added.
- `WorkflowShowcase` is shared by the published directory and Hub member workflow list. Its output format, output label, ordered stages and node count come from a validated approved definition. The visual is explicitly workflow structure, without fabricated generated content or cover art.
- `listPublishedWorkflows` filters inactive authors, fetches only the exact published version definitions, applies schema/graph/fixed-recipe validation, and projects bounded presentation fields. Returned cards contain no full definition, node config, prompts, moderation state, or private drafts. Existing platform recipe attestation remains intact.
- Hub member projection adds the same bounded presentation to the already approved exact-version read. Exact market binding, author eligibility and repeatable-read selection remain intact.
- Added `workflowCatalog` Chinese/English translation files. Root integrated the namespace.

## Checks

- Scoped ESLint passed after correcting the contract's type-only import to a same-layer workflow contract.
- Repository six-class boundary check passed (1,132 files at the check time).
- Existing published-workflows component and workflow-routes verification was attempted, but Vitest could not start in the sandbox (`spawn EPERM`). The required escalated retry was interrupted by the user. No passing Vitest result is claimed.
- `workflow-product-audit.test.ts` was inspected: its fixture never invokes `listPublishedWorkflows`, so its existing `workflowVersion.create`-only mock does not require a new `findMany` mock.
- Overall typecheck, build and browser verification remain root agent responsibility. No production run, billing, login, publication or deployment was performed by this worker.

## Explicit remaining scope

Root requested the official recipe block in `/hubs/[slug]` also adopt WorkflowShowcase, then instructed this worker to stop and finalize the report. That additional page remains unchanged by this worker; it still uses the existing official recipe layout. Organization directory semantics and Hub gates were not changed.
