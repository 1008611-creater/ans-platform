# ADR 0003: GPT-6.1 agent operating model and workflow architecture

- Status: adopted
- Date: 2026-10-14
- Scope: ANS agent collaboration, Skill loading, project rules, and workflow product boundaries

## Context

GPT-6.1 Sol High can reason about code relationships, semantic constraints, and engineering context well enough to choose more of its own implementation path. Old-model workarounds such as reading the whole repository first, running the full suite after every change, or refusing every unmentioned file can add context noise, duplicate verification, and cause premature stops. ANS also combines project discovery, Hubs, workflows, community, events, and marketplace features, so display, execution, review, billing, and integration boundaries must live in architecture rather than only in prompts.

## Decisions

### 1. Progressive disclosure

Root `AGENTS.md` keeps durable authorization, safety, routing, and completion rules. Skill descriptions provide accurate triggers. Detailed procedures, scripts, and domain guidance live in Skills, ADRs, and child documents and load only when needed. Full-repository reading is required only when the affected surface warrants it.

### 2. Risk-based routing

- S: local copy, style, field, and low-risk fixes; implement and run focused checks.
- M: single-module features; confirm entry points, contracts, and state, then verify affected paths.
- L: cross-module features; record boundaries, data flow, permissions, migrations, and rollback points.
- XL: permissions, billing, migration, production deployment, publication, or irreversible action; retain review, audit, idempotency, failure handling, rollback, and explicit authorization.

### 3. Risk-based verification

Verification may combine boundary checks, lint, type checks, affected tests, builds, browser checks, and smoke checks. Low-risk local changes do not trigger the full suite by default. If a check fails because of the current change, continue to diagnose and repair it within the authorized scope. Reports distinguish completed, verified, inferred, unverified, and blocked.

### 4. Definition of Done

A task is complete when the requested behavior is implemented, relevant verification is complete, errors are fixed or recorded, changed scope and unverified areas are clear, and a rollback entry is known where relevant. Authorized local work continues to that point. Push, PR, merge, publication, payment, and production deployment remain separately authorized external actions.

### 5. Shared workflow shell and specialized adapters

Workflow definitions use immutable versions. Only reviewed and published versions enter the public directory. Runs bind the actual version, input snapshot, node state, intermediate artifacts, permissions, and cost. The default product shape is a result landing page plus a staged studio plus a real result preview; each stage maps to real nodes and persisted state rather than fake progress.

The shared studio shell owns variable validation, run/save/resume, state, errors, and results. 3D, video, reports, and other specialized capabilities connect through adapters. Project detail presents outcome and context; workflow detail presents executable definition and versions; marketplace detail presents service, price, delivery, purchase, and order boundaries. Stable IDs, public projections, run records, and orders connect these objects.

Project-to-workflow conversion reads public project material and creates a private draft. It never executes external code or README instructions. Public projections expose bounded presentation only; prompts, private configuration, review drafts, and user input remain private. Domain rules belong in contracts, domain, and server layers. External integrations require a capability registry, least privilege, audit, idempotency, timeouts, failure handling, and rollback.

## Outcome

Rules are shorter and easier to retrieve, while the model can choose a path from project facts. ANS workflows have stable version, run, and marketplace boundaries. High-risk actions remain authorization-controlled, and ordinary local work can proceed to a deliverable state.
