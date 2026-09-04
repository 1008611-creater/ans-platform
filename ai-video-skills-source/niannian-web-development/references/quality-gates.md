# NianNian Web Development Quality Gates

Use only the gate that matches the requested change. A passing lower gate does
not substitute for a required higher gate.

## Studio Or Browser Change

1. Run focused static and unit contracts for the edited surface.
2. Open a clean browser state and execute the requested interaction.
3. For canvas work, prove new project, node save, refresh, and data readback.
4. Check affected desktop and mobile layouts, loaded assets, and browser errors.

## Server Or API Change

1. Run the focused API/runtime contract tests.
2. Verify request ownership, invalid input, and recoverable failure behavior.
3. For project data, prove persistence and refresh readback.
4. Do not use a mocked or empty provider response as evidence of a real result.

## Text, Image2, Or H3 Change

1. Verify provider readiness without exposing credentials.
2. Run a no-cost local contract or dry run first.
3. Obtain explicit authority before real image/video submission.
4. Prove result status, output download, project-owned asset registration,
   asset-library display, and refresh readback.
5. For H3, verify the channel/reference contract and billing contract before
   calling the result delivered.

## Candidate Release

1. Build from one exact merged `main` commit.
2. Verify release manifest, runtime dependencies, health endpoint, and actual
   static module/resource identities.
3. Preserve persistent data separately from the release package and retain the
   prior release for rollback.
4. Execute the changed real browser path on the candidate before requesting
   deployment approval.

## GitHub Engineering Control

1. Run the focused local quality gate before opening the pull request.
2. Require the first real GitHub run of every changed workflow to pass on the
   pull request or target branch; inspect failed logs and repair the actual
   environment/configuration mismatch.
3. Inspect open Dependabot alerts after dependency changes. Treat a clean
   production dependency audit as different evidence from Secret Scanning.
4. Verify any Release Drafter output is a draft and does not publish, deploy,
   or change user data. Record plan-gated branch/security controls as
   unavailable rather than calling them enforced.

## Public Beta

1. Complete the real Studio, text, Image2, and H3 acceptance paths.
2. Make unsupported generation nodes visibly unavailable or reference-only.
3. Obtain product-owner decisions for pricing/quotas, user access, data
   retention/deletion, support ownership, and content policy.
4. Verify backup and restore responsibility, monitoring, disk capacity, task
   failure recovery, and provider outage communication.

## Collaboration Handoff

1. Rebase on current `main` before review.
2. Keep the diff inside its workstream ownership boundary.
3. Record the user path, tests, remaining gaps, and any authorized paid call.
4. Never hand over credentials, user media, raw provider output, or signed URLs.
