---
name: win-mac-codex-bridge
description: name: win-mac-codex-bridge
---

---
name: win-mac-codex-bridge
description: Coordinate the user's Windows, Mac, and Tencent Cloud server Codex peers through verified threads, AppServer stdio, approved SSH aliases, Tailscale, and restricted relay channels. Use when the user asks Codex peers to communicate, inspect or send work across Windows/Mac/server Codex, run a one-shot exchange with reply writeback, control fixed Mac Codex employees, recover a cross-device job, or mentions 三端 Codex, Codex 点对点, Windows/Mac bridge, 腾讯云 Codex, server-main, Tailscale, SSH relay, AppServer, or 远程调度 Codex.
---

# Three-Peer Codex Bridge

Operate Windows, Mac, and the dedicated Tencent Cloud server Codex task as peer collaborators. Use the least restrictive verified channel that fits the work, then apply the stricter NianNian production controls only when the task touches NianNian's protected execution path.

Treat each verified Windows/Mac/server endpoint, AppServer route, Provider repair, exact thread, and relay receipt as a reusable shared resource. The completion record for cross-device work must state the authoritative entrypoint, capability proven, rollback fact for any change, and the shortest next reuse path. Prefer repairing and reusing the existing authoritative route over creating another bridge, thread, daemon, or credential copy.

Read [channels-and-operations.md](references/channels-and-operations.md) before the first cross-device action in a turn or whenever channel state may have changed.
Read [github-upstream-patterns.md](references/github-upstream-patterns.md) before changing the bridge protocol, recovery semantics, context transfer, receipt schema, or capability routing.

## Three-Peer General Collaboration MVP

For ordinary selected-thread collaboration among `windows`, `mac`, and `server`, use the approved on-demand bridge:

```powershell
$py = 'C:\Users\lsb\anaconda3\python.exe'
$bridge = 'C:\Users\lsb\.codex\tools\codex-peer-bridge\codex_peer_bridge.py'
```

Use `peers --probe` to verify all peers without sending a task. Use `list` or `read` to prove the exact source and destination. Use `route` for one deterministic trusted-alias selection. Use `exchange` for one complete handoff: source capsule plus recent incremental messages to destination, destination completion, reply writeback to source, source acknowledgment, then stop. Use `status --exchange-id <id>` for the local metadata-only receipt. Enterprise WeChat uses `/home/hermes/.local/bin/codex-threads status --request-id <id>` for its non-consuming mailbox receipt.

Registered stable aliases are `windows-main`, `mac-main`, and `server-main`. Resolve an alias, exact thread ID, or unique title; return candidates when a title is absent or ambiguous. Never guess a thread. Reject an active destination.

The default exchange uses the source capsule plus at most 12 recent user-visible user/assistant messages after the saved cursor. `full-increment` is explicit and still excludes hidden reasoning, raw tool logs, authentication data, and real file contents. Do not silently truncate an oversized context. Reusing a completed `exchange_id` or `clientUserMessageId` must not start another turn.

## Protocol And Receipt Contract

Apply these rules to every ordinary three-peer operation:

1. Start each AppServer connection with `initialize -> initialized`. Treat a successful list/read probe as the minimum connection evidence; do not infer send readiness from SSH alone.
2. Page `thread/list` by cursor until the target is found or the catalog ends. A one-page result is a page, not the complete catalog.
3. Resolve one exact peer and one exact thread. Before a send, reject `active` or `systemError`; for concurrency-sensitive work, perform an initial read and a second just-before-send read.
4. Bind the turn to the exact `thread_id` and returned `turn_id`. Completion requires the matching `turn/completed`, `status=completed`, `error=null`, final assistant text, and a thread readback.
5. Keep these identifiers distinct: `request_id` identifies a Hermes mailbox request; `exchange_id` identifies one cross-peer round trip; `thread_id` identifies a conversation; `turn_id` identifies one execution; `context_id` is reserved for a future logical conversation group; `artifact_id` identifies an output reference.
6. Reconcile the ledger before retrying. A completed `exchange_id` is a read-only replay; an incomplete exchange returns `EXCHANGE_INCOMPLETE_RECONCILE` until its known stages are inspected. Never start a second destination turn merely because a reply was delayed.
7. Classify peer readiness as an observation, not a permanent property: `unavailable`, `read_only`, `send_ready`, `busy`, or `degraded`. List/read without a recorded successful send is `read_only`; `send_ready` requires recent real send evidence, and Provider/final-text failures remain `degraded` even when list/read still work. Every new send still requires the exact target preflight.
8. Use typed blockers for unsupported capabilities. The current bridge exposes Hermes-side `route` and one-shot `exchange`, but does not expose cancel, artifact transfer, automatic Mac wake, autonomous multi-round chat, or guaranteed Desktop live refresh.

For SSH stdio bootstrap generated by the Windows scheduled worker, keep the outer Python program ASCII-only: Base64-wrap UTF-8 source and payload, then decode on the peer. A `SyntaxError: Non-UTF-8 code` from remote stdin is `REMOTE_BOOTSTRAP_ENCODING_INVALID`, not proof that Mac is offline. Preserve a redacted stderr summary in the pending status so this class of transport misdiagnosis remains recoverable.

Use this state vocabulary when explaining an exchange:

```text
submitted -> validated -> destination_turn_started -> destination_turn_completed
          -> source_writeback_started -> source_acknowledged -> completed
```

The current v2 ledger persists `validated`, `destination_turn_completed`, `source_writeback_started`, `source_acknowledged`, failure stages, and `completed`. Recovery reuses stable destination/source client-message IDs and reconciles before starting another turn.

For file-like outputs in this MVP, pass only an explicit reference containing path or URI, SHA-256, byte size, media type, owner peer, and last-verified time. A reference is not proof of transfer or consumption. Do not copy file contents through the chat envelope.

This bridge is the specifically approved fixed-alias, one-shot AppServer stdio route. Do not generalize it into arbitrary SSH execution, a daemon, a public listener, remote control, autonomous multi-round chat, or a credential-copy path. Hermes mailbox routing is implemented; actual cross-device file transfer remains outside this stage.

## Choose The Operating Mode First

Classify the request before selecting a transport. Do not accidentally apply NianNian production friction to ordinary cross-device work.

### General Collaboration Mode

Use this for ordinary research, coding, design, review, file inspection, planning, troubleshooting, and independent project work. Prefer the normal Codex Desktop App thread tools when the Mac host and exact thread are visible: read the target, send the task, then read its status or result. One target identity read is sufficient unless the task itself is concurrency-sensitive.

Keep normal security boundaries: never transmit secrets in prompts, do not create public listeners, and do not replace a visible Desktop App task with arbitrary shell access. A currently unavailable Mac AppServer is a transport limitation, not a reason to impose fixed-employee or NianNian job rules on unrelated work.

### Mac Codex Provider Repair Route

Use this route when the Mac Codex App starts but a configured custom Provider cannot complete a turn.

This is a general custom-Provider diagnostic, not current NianNian fixed-employee authority. When a protected NianNian employee uses the native Codex account, fresh effective App configuration and runtime readback override historical Krill, McGrox, ASXS, Cockpit, URL, or environment-variable instructions. Do not rewrite a native-account profile into the custom-Provider recipe below.

1. Prove the Mac endpoint first: use the verified `niannian-mac` route or an exposed Mac AppServer, and confirm hostname, OS, and user. Do not treat a relay status response as proof that arbitrary shell or AppServer control is available.
2. Inspect only `/Users/lsb/.codex/config.toml` Provider metadata. Report field presence and boolean settings without reading `auth.json`, environment values, bearer values, or API keys. Check the exact section spelling (`[model_providers.codex_local_access]`) and the top-level `model_provider` value.
3. Treat this mismatch as the primary diagnostic: the active custom Provider has a `base_url` and `wire_api`, but `requires_openai_auth=true` while the Mac App process has no corresponding OpenAI environment binding. Do not infer that a key in `auth.json` is automatically exported to the App process.
4. Before a repair, create a same-directory timestamped backup of `config.toml`. Change only the authorized active Provider section. For a custom upstream that supplies its own bearer configuration, set `requires_openai_auth=false`; do not copy or expose any credential value. If the upstream requires an environment binding instead, add only the approved variable name after confirming the App launch environment can provide it.
5. Read back the active Provider, the repaired boolean/binding fields, and backup existence. Gracefully restart the Mac Codex App so it reloads configuration. Do not claim success from a file edit alone.
6. Run one explicit, low-impact real turn in a user-confirmed existing thread with a no-tool/no-file-change test prompt. Accept the repair only after `turn/start`, `turn/completed`, `error=null`, and an exact expected reply marker. Then perform a thread readback. A standalone AppServer turn proves the Provider path, but does not by itself prove that a visible Desktop window is showing the turn.

Stop and report a typed blocker when the exact Mac endpoint, target thread, AppServer route, backup, or post-restart readback cannot be proven. Never use an arbitrary public listener or unrestricted shell as the default bridge.

### NianNian Protected Production Mode

Use this only for NianNian canonical/shared state, fixed Mac employees, Step01 through Step05, Provider or paid-media actions, existing Mimo task reconciliation, production deployment, or any action that can duplicate cost or corrupt evidence. Read the full NianNian controls below and [channels-and-operations.md](references/channels-and-operations.md).

## Select The Channel

1. For a Windows Codex task, use the Codex app thread tools: list/read first, then send a follow-up to the exact thread ID.
2. For a general Mac Codex Desktop App task, use its normal exposed thread route after exact `thread/read` proves identity. For a NianNian fixed Mac employee, use the supported AppServer/fixed-thread route only after exact `thread/read` proves the thread ID, title, cwd, and idle state.
3. For cross-device job transport, use the existing Tailscale SSH forced-command relay. Treat it as an explicit verb allowlist: `status`, exact-job `execute-once`, audited fixed-thread `app-turn`, or the hash-bound `install-release` operation. Never use it as arbitrary prompt or shell access.
4. For Mac-to-Windows production package/return transfer, use the project-approved private artifact broker when its non-secret project contract exists. Windows remains the only canonical writer and long-lived credential holder; Mac receives only phase-scoped, short-lived exact-object grants and must verify manifest/SHA/bytes before import or upload. A legacy pull relay may support bridge maintenance or historical recovery, but must not be selected for a new protected-production artifact path once an approved broker contract exists.
5. If the desired channel cannot prove the target endpoint, report a typed blocker. Never claim that a message was sent merely because a thread ID exists in a receipt.

Do not substitute CLI/ephemeral workers, unrestricted SSH, a new thread, or a relay command for a required visible Codex Desktop App task.

## General Dual-End Operating Loop

1. Identify the real owner and the exact target task; do not guess a thread from its title.
2. Send a concise task contract: objective, relevant paths or inputs, permitted writes, expected output, and who integrates the result.
3. Read back the target result or state before declaring the handoff complete.
4. For shared files, nominate one writer or use isolated worktrees. For independent work, parallelize freely within the user's requested scope.
5. Escalate only when the task needs a login, external payment, destructive action, production deployment, or a product decision.

## NianNian Dual-End Operating Loop

1. Read the canonical owner task and the selected execution task before dispatch.
2. Preserve one writer for shared source, project state, reducers, bundles, production data, and service configuration.
3. Give Windows ownership of canonical state, exact project/job identity, bundle source, reducer, website projection, and resume authority.
4. Give Mac ownership of Mac-local environment evidence, bundle install/readback, authoritative Skill execution, media/provider interaction under current authority, and return receipts.
5. Bind every handoff to exact project/job ID, source SHA, bundle SHA, employee thread ID, allowed actions, prohibited actions, expected artifacts, and completion evidence.
6. Start a Mac App turn only after an initial read, active-turn rejection, and a second CAS read. Reuse the fixed thread; do not recreate it. If using the forced-command relay `app-turn` bridge, the Mac-local runner must perform these AppServer checks on the Mac endpoint and write the exact receipt.
7. Accept App completion only with `turn/completed`, `status=completed`, `error=null`, followed by exact `thread/readback`.
8. Accept cross-device work only after return manifest, file hashes, receipt, reducer state, and user-facing projection agree.
9. Continue the approved low-risk phase after handoff. Do not stop at a prompt, audit, bundle, install, parity, adoption, or transport receipt when the requested production artifact remains missing.

## General Message Contract

For normal cross-device collaboration, send only what the target needs:

```text
objective; relevant paths/inputs; permitted writes; expected result; integration owner
```

Do not demand project IDs, source hashes, fixed-employee leases, or production receipts unless the task itself needs them.

## NianNian Production Message Contract

Use a compact handoff containing:

```json
{
  "project_id": "exact-id",
  "job_id": "exact-id-or-null",
  "phase": "current-phase",
  "canonical_owner_thread_id": "windows-thread-id",
  "executor_thread_id": "mac-thread-id",
  "source_sha256": "sha256-or-null",
  "bundle_sha256": "sha256-or-null",
  "allowed_actions": [],
  "prohibited_actions": [],
  "expected_artifacts": [],
  "completion_evidence": [],
  "next_owner": "windows-or-mac"
}
```

Do not put passwords, API keys, cookies, tokens, browser storage, private-key contents, or raw provider secrets in prompts, receipts, durable memory, or bridge state. Report credential presence only.

## General Safety Boundaries

- Keep Tailscale/SSH private. Do not expose SSH, VNC, RDP, AppServer, or a new listener publicly.
- Do not send passwords, API keys, cookies, tokens, browser storage, or private keys in cross-device prompts or durable receipts.
- Do not replace a visible Desktop App task with arbitrary shell access.

## NianNian Production Safety Boundaries

- Use the installed forced-command key only for its allowlisted verbs. The `app-turn` verb accepts only the five fixed NianNian task IDs, a SHA-bound base64url JSON envelope, read-only/network-false sandboxing, and a mode-600 receipt. Do not widen it to arbitrary shell, arbitrary task IDs, or unsigned prompts.
- `install-release` is the sole write-enabled bridge maintenance verb. It accepts one request ID, release version, manifest SHA, and archive SHA; runs only the zero-argument fixed pull/bootstrap script; verifies the published identity and installed readback; and writes a mode-600 receipt. It must never accept a command, path, prompt, Provider action, project-media operation, deployment, or spend request.
- A gateway older than release `2026.07.18.8` cannot bootstrap this verb into itself. Classify that boundary as `MAC_BRIDGE_BOOTSTRAP_UPDATE_REQUIRED`; do not claim autonomous installation until one controlled Desktop workspace-write bootstrap installs and readbacks `2026.07.18.8` or newer. After that boundary, routine bridge updates use `install-release` without another Desktop prompt.
- Do not confuse employee-model traffic with media Provider authorization.
- Do not duplicate a known or uncertain provider task. Reconcile the existing task/transaction first.
- Do not change deployment, DNS, service, data root, permissions, or production data without the applicable authorization.
- Do not use local pixel editing for production/candidate/reference images without the user's explicit operation-specific permission.
- When direct Mac AppServer control is unavailable, use `MAC_CODEX_APP_SERVER_UNAVAILABLE` or a more specific typed blocker. When the relay is installed but lacks the audited `app-turn` verb, use `MAC_RELAY_APP_TURN_NOT_INSTALLED`. A manual user paste is a user action, not a successful bridge send.

## NianNian Fixed Employees

For NianNian AI, reuse the five fixed employee IDs and canonical Mac root in the reference file. Select the employee through the project phase selector when one exists. Verify all fixed employees are idle before a phase that requires global employee exclusion.

Treat the five employees as fixed audit/execution roles, not interchangeable capacity. Dispatch their read-only audits sequentially in employee order unless an accepted production phase selector chooses one exact owner. Before every audit turn, require all-five idle plus a second CAS read; do not relax this guard to gain concurrency. Keep Windows as the only shared canonical writer and store only receipt hashes, byte counts, exact turn identity, and typed findings, never full response text or secrets. See [channels-and-operations.md](references/channels-and-operations.md) for the role map.

Use one exact Windows dispatcher authority for a fixed-employee phase, but do not implement that authority with a lease, lock file, heartbeat, TTL, automatic renewal, automatic stale-lease recovery, or any other persistent coordination gate. These mechanisms create an artificial waiting state and are prohibited from the normal and protected-production paths.

Prevent real duplicate work through source-bound idempotency keys, append-only dispatch-attempt events, exact thread/turn binding, and an initial plus second CAS read that proves the selected employee is still idle. A compare-and-set failure simply returns the current attempt or typed active-turn state; it must not install a lease, require a human to clear a lease, or block recovery after elapsed time. A retry is a separate exact request/turn/receipt and must reconcile known Provider work before any submission.

Treat any pre-existing lease-like artifact as legacy history, not as a production admission gate. Do not create, install, enable, renew, recover, or reactivate one. Before changing legacy code or data that still depends on one, replace its behavior with the idempotency/CAS/attempt-event path and verify that the replacement prevents duplicate side effects without introducing a waiting state. A future parallel read-only batch may use the same exact-attempt and CAS controls inside one audited coordinator; production Step01, Provider, shared writes, and independent dispatchers remain serial through the canonical attempt ledger, not through a lease.

The Windows NianNian owner remains the only shared canonical writer. The selected Mac employee may inspect and change Mac-local runtime state within the approved contract, but shared fixes must return to the Windows owner for one canonical bundle and one SHA-bound adoption path.

## Verification And Completion

Classify evidence as `structural`, `integrated`, `real_delivery`, or `blocked`.

Before reporting a bridge change complete:

1. Verify skill syntax/structure and the actual changed files.
2. Run a status-only cross-device probe when the verified relay is available.
3. Exercise a real Windows task read/send/readback path without disturbing unrelated work.
4. Exercise a Mac fixed-thread read-only turn only when the AppServer endpoint and thread identity are available; otherwise report the typed blocker.
5. Run the mandatory `post-coding-review` after any Skill, script, automation, bridge, or pipeline edit.
6. State what was verified and what was not. Never promote structural bridge readiness to real cross-device execution or real delivery.
