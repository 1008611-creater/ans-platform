# GitHub Upstream Patterns

Research date: 2026-07-20. Treat these links as design sources, not installed dependencies. Re-read the version-specific Codex schema before changing the bridge protocol.

## Sources and adopted rules

### OpenAI Codex AppServer

- Source: https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md
- Use one `initialize` request and one `initialized` notification per connection before any other method.
- Generate or inspect the schema from the installed Codex version; do not assume a newer GitHub `main` schema matches every peer.
- Page `thread/list` with its cursor, then use `thread/read(includeTurns=true)` for the exact selected thread.
- Resume a stored thread before `turn/start`; accept completion only from the matching `threadId` and `turnId` in `turn/completed`, followed by readback.
- Treat JSON-RPC `-32001` as retryable overload and use bounded exponential backoff with jitter. Do not retry terminal or validation failures.
- Treat `thread/compact/start` as asynchronous; its immediate `{}` response is not compaction completion.
- Keep stdio as the production transport. The official README marks WebSocket transport experimental/unsupported.

Operational caveat, not a protocol guarantee: https://github.com/openai/codex/issues/21743 reports that a second AppServer client can persist a turn without immediately refreshing an already-open Desktop renderer. Therefore AppServer readback proves persisted continuity; it does not prove live UI refresh.

### A2A Protocol

- Source: https://github.com/a2aproject/A2A/blob/main/docs/specification.md
- Keep `task_id`, `context_id`, message ID, and artifact ID as different namespaces.
- Model work with explicit nonterminal and terminal states. Do not send more work to a terminal task.
- Use capability discovery before optional streaming, subscription, push, or cancellation behavior; return a typed unsupported error when absent.
- Reconcile an existing task before retrying. A message ID may be used for duplicate detection; cancellation is bound to one exact task and is idempotent.
- Treat artifacts as first-class outputs with identity and media type rather than embedding them in task status.

### OpenAI Agents SDK

- Handoffs: https://github.com/openai/openai-agents-python/blob/main/docs/handoffs.md
- Guardrails: https://github.com/openai/openai-agents-python/blob/main/docs/guardrails.md
- Sessions: https://github.com/openai/openai-agents-python/blob/main/docs/sessions/index.md
- Tracing: https://github.com/openai/openai-agents-python/blob/main/docs/tracing.md
- Give each destination its own explicit route and filter the transferred history; do not let a model invent a destination.
- Run blocking validation before side-effecting dispatch. Workflow-level input/output guardrails do not automatically protect every delegated/tool step.
- Keep stored session history separate from per-run selected context. Filter retrieval without re-saving old items as new ones.
- Trace one end-to-end exchange with child stages, but keep sensitive prompt/tool bodies out of durable traces and ledgers.

### LangGraph Checkpoint

- Source: https://github.com/langchain-ai/langgraph/blob/main/libs/checkpoint/README.md
- Adopt checkpoint thinking without adding the LangGraph runtime: save the last verified stage and pending write identifiers so recovery does not rerun already completed side effects.
- Scope checkpoints by exact thread/link identity. Never use a checkpoint from a different peer, thread, or exchange.
- Do not deserialize arbitrary checkpoint objects; the current bridge uses constrained JSON metadata only.

### Model Context Protocol

- Lifecycle: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/basic/lifecycle.mdx
- Resources: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/server/resources.mdx
- Negotiate version and capabilities before operations, and use only negotiated optional capabilities.
- Represent shareable resources with stable URI/path, media type, size, hash, owner, and last-modified metadata. Read or copy contents only when the user-selected operation needs them.
- Page resource discovery. A resource reference is not proof that its contents were read, transferred, or consumed.

## Mapping to the current bridge

Implemented now:

- `initialize -> initialized`, cursor-aware list calls, exact `thread/read`, `thread/resume`, `turn/start`, matching `turn/completed`, final-text capture, and thread readback.
- Three fixed peers and exact alias/ID/unique-title resolution.
- One-shot `exchange`, `exchange_id` replay protection, incremental history cursor, context SHA, hop limit, destination completion, source writeback, and metadata-only ledgers.
- Hermes mailbox request validation, request-ID reconciliation, typed failures, and cached-response upload recovery.

Contract rules that callers must enforce now:

- Page until the desired thread is found; do not assume one page is a complete catalog.
- Perform an initial target read and a just-before-send read for concurrency-sensitive or side-effecting work.
- Report evidence as `structural`, `integrated`, `real_delivery`, or `blocked`.
- Report queued mailbox work as `pending`, never as sent or completed.

Planned, not implemented by the current CLI/mailbox:

- Rich peer readiness states beyond available/unavailable.
- A public cancel command, artifact transfer, Hermes-side `exchange`, automatic overload backoff, and cross-client Desktop refresh.
- Full protocol/version capability matrices persisted per peer.

Do not claim a planned item is available. Do not install these repositories, add a public listener, copy credentials, or replace the existing Windows single-coordinator MVP merely to imitate an upstream framework.
