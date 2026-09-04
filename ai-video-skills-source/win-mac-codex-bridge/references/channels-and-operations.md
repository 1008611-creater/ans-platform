# Win-Mac Channel And Operations Reference

## Operating Modes

The fixed-employee, global-idle, CAS, and receipt rules below are **NianNian Protected Production Mode only**. They are required for NianNian shared canonical state, Step01-Step05, paid Provider actions, production deployment, and existing Mimo reconciliation. They must not be imported into normal Windows/Mac collaboration merely because the bridge skill was triggered.

For General Collaboration Mode, use visible Codex App thread tools whenever the Mac host is exposed: exact target read, compact task handoff, then status/result readback. Independent tasks may run in parallel. Keep ordinary security constraints (no secrets in prompts, no public listeners, no arbitrary SSH substitute), but do not require five-employee exclusion, NianNian project IDs, source hashes, or mode-600 receipts.

The installed forced-command `AppTurn` transport remains technically narrow by design: it is for the five NianNian fixed employees, not a generic arbitrary-prompt tunnel. General Mac Desktop work needs the normal multi-host Codex thread route or a separately approved, audited general collaboration transport.

## NianNian Protected Production Channel Matrix

| Need | Supported channel | Completion proof | Forbidden substitution |
|---|---|---|---|
| Read or message a Windows Codex task | Codex app `list_threads`, `read_thread`, `send_message_to_thread` | Exact thread ID plus subsequent thread status/readback | Guessing from title or writing a raw automation directive |
| Read or message a fixed Mac Codex App employee | Mac-local Codex AppServer, either directly on that endpoint or through the audited forced-command `app-turn` wrapper | Exact ID/title/cwd, all-five idle/CAS reads when required, clean `turn/completed`, exact readback, mode-600 receipt | CLI, ephemeral worker, new thread, unrestricted SSH, arbitrary task IDs |
| Check Windows-to-Mac transport | Installed `Invoke-AiBrainMacRelay.ps1 -Action Status` | JSON with `service=ai-brain-mac-relay`, `shell=false`, project present | General SSH command |
| Send one read-only fixed Mac App turn | Installed `Invoke-AiBrainMacRelay.ps1 -Action AppTurn -RequestId <id> -FixedThreadId <fixed-id> -PromptFile <utf8>` after gateway upgrade | Mac-local receipt with request/thread/envelope SHA, read-only/network-false `turn/start`, clean completion, exact readback hash/bytes | Arbitrary SSH, shell command, unknown thread, prompt with secrets, Provider/spend/write request |
| Install one sealed Mac bridge release | Installed `Invoke-AiBrainMacRelay.ps1 -Action InstallRelease -RequestId <id> -ReleaseVersion <version> -ManifestSha256 <sha> -ArchiveSha256 <sha>` on gateway `2026.07.18.8` or newer | Exact release identity, fixed-script execution, installed state plus install receipt SHA/bytes, mode-600 operation receipt | Arbitrary command/path, writable AppTurn, unbound latest package, Provider/media/spend/deploy action |
| Diagnose fixed HQ failure | Installed `Invoke-AiBrainMacRelay.ps1 -Action HqDiagnose` | Fixed exit receipt and log SHA/bytes plus allowlisted typed error; all side-effect flags false | Arbitrary log/path read, raw log text, credentials, Provider/media action |
| Execute one exported relay job | Installed relay `ExecuteOnce` with exact `web_nn-*` or `web_ns-*` ID and current policy authority | Exact job receipt, return manifest, hashes, reducer projection | Arbitrary prompt, arbitrary shell, duplicate job |
| Mac downloads a production package or uploads a production return | Project-approved private artifact broker, after Windows publishes exact manifest-bound objects and issues phase-scoped grants | Exact object key, source/transport/return manifests, SHA/bytes verification, broker receipt, and reducer import | Reverse SSH/SCP as a new production path, broad bucket credentials on Mac, directory listing, copying unverified latest files |
| Snapshot daily cross-device state | `Sync-AiBrainCrossDeviceRelayState.ps1` | Atomically written redacted state JSON | Treating state sync as execution |

## Verified Resource Identities

- Windows control host: current Windows Codex desktop and canonical repositories.
- Mac execution host: Tailscale `100.68.119.126`, user `lsb`.
- Windows Tailscale address used by the Mac pull route: `100.125.247.33`.
- Installed Windows relay caller: `C:\Users\lsb\.local\bin\Invoke-AiBrainMacRelay.ps1`.
- Canonical relay caller source: `E:\codex\aisp\aidaihuo\niannian-ai-canonical-local\bridge\Invoke-AiBrainMacRelay.ps1`.
- Cross-device status sync: `E:\codex\aisp\aidaihuo\niannian-ai-canonical-local\bridge\Sync-AiBrainCrossDeviceRelayState.ps1`.
- NianNian Windows owner task: `019f4b46-20c6-7a93-b241-fbc919957c0b`.
- NianNian canonical Mac project root: `/Users/lsb/AI-Brain/niannian-ai-canonical-local`.

## Fixed NianNian Mac App Employees

| Employee | Thread ID | Fixed role |
|---|---|---|
| 01 | `019f6201-c013-7cf3-b155-61d2789085f4` | Step01 execution environment and HQ owner: Mac root, leases, fixed-employee idle state, runtime HQ, credential presence only. |
| 02 | `019f6201-cb91-7cf0-819e-696eeabd9e78` | Bridge and authentication execution-side auditor: AppServer/store identity, launchd environment inheritance, installed gateway/runner SHA, receipt/replay evidence. |
| 03 | `019f6201-d5e8-7083-884d-c714eb1a78b0` | Authoritative Skill, Bundle parity, and adoption auditor: accepted Skill, install/parity/adoption, transport/dispatcher SHA mismatches. |
| 04 | `019f6201-dff9-7f63-94d8-7f9020b3c223` | Media runtime preflight auditor: exact source readability/hash, ffmpeg/ffprobe, disk, output permissions, and Step01 media dependencies without media writes. |
| 05 | `019f6201-ea1b-7e22-9dd0-a3b851b15b69` | Independent QA and website projection auditor: Step01 completion contract, manifests/ledger/gates, failed-versus-queued consistency, recovery idempotency and duplicate-dispatch risk. |

These IDs are identity inputs, not proof of reachability. Before sending, require a live `thread/read` through the selected AppServer endpoint and verify the expected title and cwd.

For role audits, use sequence `01 -> 02 -> 03 -> 04 -> 05`. Each turn must independently perform all-five idle reads, exact identity checks, a second CAS read, clean completion, exact readback, and a mode-600 receipt before the next role starts. A standalone/headless AppServer completion is not proof that the user-visible Desktop App shows the turn; when Desktop visibility is material, require exact-store evidence or one user refresh/readback before describing the employee as visibly working. Never create replacement threads or use a CLI/SSH worker as an employee substitute.

Only one Windows owner may dispatch a role-audit phase. Prevent two independently launched requests from both passing preflight with a source-bound idempotency key, append-only dispatch-attempt event, exact thread/turn binding, and the initial plus second CAS read. Do not create a lease, lock file, heartbeat, TTL, renewal, stale recovery, or human-clear gate. Treat `turn/completed` for a started turn followed by a different latest turn as `MULTI_DISPATCHER_LATEST_TURN_RACE`, preserve the failed attempt receipt, and do not reinterpret it as employee content failure. Failed-attempt replay must expose only redacted turn/error/readback fields.

The planned `parallel read-only batch` is a separate, production-default-off mode: one coordinator, one batch-wide all-five identity/idle/CAS snapshot, fixed IDs only, independent source-bound attempt IDs and receipts, at most three concurrent turns initially, read-only/network-false and every side-effect flag false, exact per-turn completion/readback, and one aggregate receipt. Any write, Provider, spend, deployment, send, local-edit, shared-canonical mutation, or second coordinator rejects the entire batch. Do not use this planned mode until its runner, tests, Mac installation/SHA readback, real read-only probe, and post-coding review exist.

## AppServer Discovery

Use the Codex app thread tools first when they expose the target. For project-specific AppServer work, discover the installed binary and prove it can read the target before dispatch.

Known candidates include:

- Windows plugin AppServer: `C:\Users\lsb\.codex\plugins\.plugin-appserver\codex.exe`.
- Mac standalone package candidate: `~/.codex/packages/standalone/current/codex`.

Do not assume a binary on Windows can see Mac App tasks. Reachability exists only when `thread/read` succeeds for the exact Mac thread through that endpoint.

Required App sequence:

```text
thread/read exact target
read all fixed employees when global exclusion is required
reject active target or employee collision
thread/resume only when exact task is notLoaded
second thread/read/CAS
turn/start exact existing task
turn/completed(status=completed,error=null)
thread/readback exact completed turn
```

## Relay Operations

Status-only probe on Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File `
  "$env:USERPROFILE\.local\bin\Invoke-AiBrainMacRelay.ps1" `
  -Action Status
```

The installed caller is the runtime authority. Inspect its current `ValidateSet` before using a verb: the source may contain a newer `Prepare` operation while the installed caller still allows only `Status` and `ExecuteOnce`.

An `ExecuteOnce` action requires an exact job ID, current policy/authorization, an existing pending export, idempotency reconciliation, and no active collision. It is not a channel for sending conversational prompts to a Mac Codex App task.

The audited `AppTurn` action is narrower than general SSH and broader than status-only transport: Windows supplies a local UTF-8 prompt or prebuilt envelope; the Windows caller creates a JSON envelope with `schema_version=niannian_mac_fixed_thread_app_turn_request_v1`, the exact fixed thread ID, canonical Mac root, `read_only=true`, `network_access=false`, all media/spend/write/deploy/local-edit flags false, SHA-256, and base64url payload. The Mac gateway accepts only the five fixed IDs and calls `bridge/mac_codex_app_fixed_thread_turn.js`, which performs AppServer identity/idle/CAS/resume/start/completion/readback and writes a mode-600 receipt. It is still not a production-job substitute; downstream job reducers must consume the receipt explicitly.

`InstallRelease` is deliberately separate from `AppTurn`. The Windows caller and forced gateway require exactly four safe tokens: request ID, release version, manifest SHA-256, and archive SHA-256. The Mac runner executes only `/bin/bash /Users/lsb/AI-Brain/niannian-ai-canonical-local/bridge/pull_mac_bridge_bootstrap.sh` with zero arguments, passes the expected identity through fixed environment names, rejects test overrides in production, verifies exact installed state and install receipt, and records replay/conflict in a mode-600 receipt. The operation keeps arbitrary command execution, Provider access, project-media work, spend, deployment, and real delivery false.

Activation is versioned. An installed gateway older than `2026.07.18.8` does not understand `install-release` and cannot install the new verb through that same missing verb. One controlled Mac Desktop workspace-write bootstrap is required at that boundary. After installed-state readback proves `2026.07.18.8` or newer, future sealed bridge releases can be installed from Windows through `InstallRelease` without a writable employee turn.

For exact project `NN-20260715083045-8120F5`, D-022 is the persistent user cost policy for scoped Mimo ASR and Paddle OCR analysis. A short authority receipt expiring does not revoke D-022. The Mac HQ runner must first reuse a fresh ready HQ gate without network calls; otherwise it validates the sealed exact-project D-022 policy and atomically derives one short-lived authority before a single synthetic refresh. An invalid/tampered authority fails closed. Credential health-proof expiry and short-authority expiry must not be projected as credential loss or a request for credential re-entry.

When this project has a provisioned private artifact broker, its exact provider/bucket/region and lifecycle facts live only in the project-local broker contract, never in this global Skill. The global route is stable: Windows publishes and signs exact package objects; the fixed Mac Codex App worker verifies and consumes only those objects; it uploads only manifest-declared returns; Windows imports verified return objects and invokes the existing reducer. Do not write credentials, signed URLs, customer media, or task-local artifacts into this reference.

## Failure Classification

- `WINDOWS_CODEX_THREAD_NOT_FOUND`: Windows task tool cannot prove the requested task.
- `MAC_CODEX_APP_SERVER_UNAVAILABLE`: no verified endpoint can read the fixed Mac task.
- `MAC_CODEX_THREAD_IDENTITY_MISMATCH`: ID, title, or cwd differs from authority.
- `MAC_CODEX_THREAD_ACTIVE`: an active turn prevents a safe new turn.
- `MAC_CODEX_THREAD_CAS_CHANGED`: state changed between preflight reads.
- `MAC_RELAY_STATUS_FAILED`: status-only forced command failed or returned invalid policy.
- `MAC_RELAY_APP_TURN_NOT_INSTALLED`: source supports `app-turn`, but the installed user-space caller or forced-command gateway has not been upgraded.
- `MAC_RELAY_APP_TURN_FAILED`: the installed `app-turn` route ran but returned a typed validation, AppServer, completion, or readback failure.
- `MAC_BRIDGE_BOOTSTRAP_UPDATE_REQUIRED`: the installed gateway predates the fixed `install-release` verb, so one controlled Desktop bootstrap is required before autonomous updates are available.
- `MAC_BRIDGE_INSTALL_RELEASE_FAILED`: the fixed install operation rejected identity, pull verification, execution, installed readback, receipt, or replay consistency.
- `MAC_RELAY_JOB_NOT_EXACT`: job ID/pending export/authority is missing or mismatched.
- `CROSS_DEVICE_RETURN_EVIDENCE_INVALID`: return receipt, manifest, hash, reducer, or website projection disagrees.

Do not collapse these into generic `blocked` or claim a successful send without endpoint proof.
