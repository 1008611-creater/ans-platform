---
name: niannian-web-development
description: name: niannian-web-development
---

---
name: niannian-web-development
description: Run NianNian AI web changes from GitHub Issue through isolated branch, focused implementation, real verification, pull-request handoff, release candidate, and explicitly approved production deployment. Use for NianNian Studio, canvas, API, provider, asset-library, homepage, deployment, rollback, beta-readiness, CI, observability, data-recovery, or two-person collaboration work.
---

# Niannian Web Development

## Overview

Deliver one verified NianNian user path at a time without bypassing source
authority, project ownership, provider-cost approval, or release verification.
Treat `AGENTS.md` and `COLLABORATION_AND_HANDOVER.md` as the project-specific
authority; this Skill supplies the reusable execution method.

## Workflow

1. Read the current Issue, active branch, `AGENTS.md`, and the handover document.
   Identify the first unfinished user-visible path, its owner, and the smallest
   end-to-end result the user can actually verify before editing.
2. Work from current `main` on an Issue-linked branch. Respect the Studio and
   server/provider path boundaries. Create a separate API-contract change
   before altering a cross-boundary API contract.
3. Make the smallest durable implementation. Do not replace confirmed canvas,
   branding, assets, adapters, or results with placeholders, stale bundles, or
   browser-held credentials.
4. Run the smallest quality gate that proves the changed path. Read
   [references/quality-gates.md](references/quality-gates.md) for the gate
   matching UI, API, provider, data, release, or public-beta work.
5. Commit focused changes. In the handoff or pull request, state the user path,
   changed files, exact verification, remaining gaps, and whether real provider
   spend occurred. Never include credentials, user media, raw provider replies,
   or signed URLs.
6. Merge only a pull request that has passed its prescribed CI into `main`.
   Do not require an approving-review count unless the product owner explicitly
   selects one. Build a release candidate from that exact commit. Deploy only
   after the product owner explicitly approves the candidate and the real
   production readback succeeds.

## End-To-End Pull Request Boundary

- Default to one pull request per independently verifiable user outcome, not
  one pull request per schema, API layer, panel, test, or preparation step.
  A contract, security, or infrastructure PR may stand alone only when it is
  independently mergeable and immediately reduces risk for the next outcome.
- Do not extend a feature through a chain of unmerged dependent pull requests.
  When more than two dependent PRs exist, stop adding features and consolidate
  the required work onto a clean branch from current `main`, or finish and
  accept the existing base before continuing.
- Count progress only from the real user path: input accepted, server execution
  performed, recoverable state persisted, result registered to the project,
  refresh recovery proven, and the result previewed or downloaded. PR count,
  commit count, UI surfaces, tests, CI, HTTP 200, and provider task IDs are
  evidence components, not product delivery.
- Before opening another PR, state which incomplete user outcome it closes. If
  it closes none, fold it into the active outcome or defer it.

## Plan Statements Are Progress, Not Pauses

- A plan, Skill route, or step list is a progress update, not a stopping point.
  After stating the plan, execute the smallest in-scope next action immediately
  and continue through verification without waiting for a second approval.
- Stop for user input only at a real hard boundary: production deployment when
  not yet authorized, credential access or rotation, material provider cost,
  account/permission changes, irreversible external changes, or an explicitly
  stated acceptance tradeoff.
- When the product owner complains that work was promised but not delivered,
  first identify the narrowest durable fix (usually an execution rule in
  `AGENTS.md` or this Skill), apply it, then complete the previously promised
  user-visible path and report the real verified result.

## GitHub Delivery Preflight

Before adding or changing `.github/workflows/**`, check that the authenticated
GitHub CLI credential can write workflow files. If GitHub rejects a push for a
missing `workflow` scope, stop before retrying and request an interactive
credential refresh; never ask for or copy a token into chat, code, or files.

Before promising GitHub enforcement for a private repository, query the actual
availability of branch protection, repository rulesets, Secret Scanning, and
private vulnerability reporting. Enable every available no-cost control, but
record plan-gated controls as unavailable rather than claiming that a local
policy or a workflow enforces them. Keep CI useful even when branch protection
is unavailable, and do not publish, upgrade a plan, or make the repository
public without explicit product-owner approval.

After a workflow, dependency, or release-automation change reaches GitHub,
read the first real Actions result on the target branch. A local test does not
prove Linux CI, browser provisioning, workflow configuration, or release
automation. Fix a proven failure in a focused follow-up change before treating
the control as delivered. Treat a Release Drafter draft as changelog
preparation only, never release or deployment authorization. Inspect open
Dependabot alerts after dependency changes and distinguish dependency scanning
from Secret Scanning.

## Branch And Ownership Decisions

- Treat `main` as the sole shared source authority. Do not merge a ZIP, copied
  candidate, server checkout, or generated release package back into source.
- While the second contributor is unavailable, advance only the primary owner's
  active workstream. Keep the other workstream reserved to avoid future merge
  conflicts.
- Before the contributor begins, invite them to the private repository and
  assign the matching Issue. Protect `main` with pull requests and no force
  pushes when the current GitHub plan supports it, but do not require an
  approving-review count unless the product owner explicitly selects one.
- Merge Studio recovery before provider-runtime work when both affect the same
  end-to-end canvas path.

## Provider And Data Boundaries

- Keep all credentials in server environment files. Never place credentials in
  source, GitHub, browser code, releases, chat-derived artifacts, or handovers.
- Do not incur image or video provider cost without explicit authority. A
  readiness endpoint, dry run, or local test is not proof of a real result.
- Require a saved node and project-owned input assets before a generation call.
  Require output assets to survive refresh before treating a generation path as
  delivered.
- Keep runtime data and user media outside release packages. Verify persistent
  data and rollback boundaries before an approved production deployment.

## Product Readiness

- Keep public scope truthful: only advertise a node as generative after it has
  a complete server executor, real result lifecycle, asset registration, and
  browser readback. Present all other nodes as edit/reference-only.
- Do not call a build, test command, health endpoint, or provider readiness
  status a user delivery. Use the corresponding real path from the quality gate.
- Before public beta, require the product owner to define commercial and usage
  policy, recovery ownership, and access/data handling. Do not invent those
  policies from technical defaults.
- Keep observability, persistent worker recovery, multi-user storage, and
  public-beta governance as explicit tracked delivery work until their real
  acceptance paths pass. Repository configuration and passing CI do not
  complete those operational product capabilities.

## Completion

Complete a NianNian change only when the correct quality gate passes, the
handoff contains the evidence needed by the next owner, and any deployment has
the product owner's explicit approval. Report verified delivery and unverified
gaps separately.
