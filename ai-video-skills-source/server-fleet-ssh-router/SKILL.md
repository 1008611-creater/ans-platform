---
name: server-fleet-ssh-router
description: name: server-fleet-ssh-router
---

---
name: server-fleet-ssh-router
description: Safely identify, connect to, inventory, and operate the user's Windows, Linux, and Mac server fleet through recorded SSH aliases and host-specific boundaries. Use when the user asks about a server, VPS, 云服务器, SSH, deployment host, migration, backup, capacity, service, port, domain-to-host route, or which machine should receive work.
---

# Server Fleet SSH Router

Read `references/fleet.md` before selecting or connecting to a host. Treat it as a routing index, not proof of current runtime state; refresh material facts before acting.

## User Authorization Precedence

- A current user message that explicitly names the target host and operation is sufficient business authorization for that operation. Do not add a discretionary confirmation step or stop at a plan after the required read-only preflight passes.
- This precedence covers deployment, rollback, restart, shutdown, reinstall, package upgrade, service change, backup, snapshot, data copy/migration/deletion, firewall/security-group change, DNS/tunnel change, public exposure, credential/key installation or rotation, and explicitly named provider submission or charge when the request also names the cost/submit scope.
- Execute the named operation through the verified control path, preserve a rollback fact, and perform authoritative post-action readback. Keep unrelated services, data, and hosts out of scope.
- The authorization is not permission to read, repeat, store, or transmit secret values; to auto-fill credentials; to bypass host-key verification, MFA, CAPTCHA, rate limits, or provider safety controls; or to use an unverified control channel. Those boundaries remain non-overridable.

## Route Safely

1. Match the requested project and role to one exact host alias.
2. Run `ssh -G <alias>` locally before a material operation to confirm the resolved host, port, user, and identity file.
3. Start with `ssh -o BatchMode=yes <alias> "hostname"` and a read-only resource/service probe.
4. Verify hostname, OS, project role, public route, data root, backup, and current owner before any write.
5. Keep one production writer. Do not deploy, restart, migrate, delete, change DNS/tunnels/firewalls/permissions, or rotate credentials without explicit current authorization.
6. Report the highest evidence actually proven: configuration, live readback, integrated route, or real delivery.

For public app delivery, terminate ingress at one HTTPS reverse proxy such as Caddy, bind application/API/database ports to loopback, and point distributed clients such as APKs at the public domain. After Compose overlays are merged, verify the effective published ports rather than assuming an override replaced the base list; only claim external delivery after the domain resolves and the HTTPS route succeeds.

## Credential Boundary

- Never store or repeat passwords, private-key contents, API keys, tunnel tokens, cookies, session files, or `.env` values in this Skill, prompts, logs, or durable memory.
- Record only SSH aliases, endpoints, usernames, public key fingerprints, private-key paths, host-key fingerprints, roles, and verification dates.
- Prefer one dedicated Ed25519 key per provider or trust boundary. Use `IdentitiesOnly yes`.
- Keep `StrictHostKeyChecking yes` after the first host key is captured and independently verified. If provider-side fingerprint verification is unavailable, mark it unverified.
- Report credential presence without reading its value. Redact service/process arguments before output.
- Do not copy credentials between Windows, Mac, and cloud servers.

## Explicit User Authorization

- Treat the user's current, specific authorization as the authority for the named server operation. Do not add a discretionary second confirmation for that same operation.
- When the user authorizes a service change, firewall/security-group change, key installation, deployment, rollback, restart, or migration, perform it through the available authorized control path after the required preflight and readback.
- Prefer the user's stated target, scope, and urgency over conservative defaults that would otherwise stop only to request permission again. Preserve evidence, rollback facts, and the one-production-writer rule.
- Explicit authorization never permits storing, repeating, or placing passwords and other secrets in commands, scripts, logs, prompts, or durable configuration. It also does not bypass host-key verification, authentication controls, or a missing server control channel.

## PsyIDC Access Boundary

- Treat PsyIDC noVNC/VNC as unavailable for operational work. User-confirmed fleet
  evidence is that the PsyIDC servers cannot establish usable VNC sessions.
- Do not spend time retrying noVNC, extracting its URL parameters, or treating a
  browser `Connecting` state as server health evidence.
- Use SSH as the only normal operational path: establish a dedicated per-host
  Ed25519 key, verify `BatchMode=yes` access, and then perform the required
  read-only inventory or authorized operation.
- If a new PsyIDC host has no authorized SSH key yet, stop before migration or
  deployment and request a one-time public-key installation through a user-run
  SSH session or provider-supported SSH-key mechanism. Never place a password
  in a command, script, prompt, or durable configuration to work around this.

## Read-Only Default

Allowed without additional authorization when in scope:

- hostname, OS, CPU, memory, disk, mount, listener, service, container, timer, and directory-structure inventory;
- safe application presence checks that do not read secrets or user payloads;
- hashes, public key fingerprints, SSH effective configuration, backup presence, and rollback-path checks;
- domain -> proxy/tunnel -> host -> service -> data-root tracing.

Require explicit current authorization for only the following operations when the user has not already authorized them in the current request:

- deployment, rollback, reboot, shutdown, reinstall, package upgrade, service change, firewall/security-group change, DNS/tunnel change, credential/key installation or rotation, data copy/migration/deletion, snapshot creation/restoration, or public exposure;
- reading `.env`, database rows, session contents, private keys, tokens, or user payloads.

## New Host Onboarding

1. Record the provider instance ID, region, OS, CPU/RAM, system/data disks, network type, bandwidth semantics, billing term, and intended role.
2. Generate a dedicated local Ed25519 key; never reuse a password as durable access.
3. Capture the server host key into a host-specific known-hosts file and record its fingerprint as unverified until checked against an independent provider channel.
4. Add a stable SSH alias with an explicit user, port, identity file, `IdentitiesOnly yes`, strict host checking, and host-specific known-hosts file.
5. Install only the public key through an authorized console/password session. Then prove `BatchMode=yes` access.
6. Disable password/root SSH only after a second privileged recovery path, snapshot/console access, and key login are proven.
7. Run a fresh read-only inventory. Do not assign production or redirect traffic merely because SSH works.

## NianNian Placement Rule

Keep the NianNian control plane and media plane separate:

- Do not make a production public route, tunnel, SSH forward, task queue, webhook, or delivery path depend on a port on the user's Windows or Mac. Terminate public ingress on a cloud host or provider-managed edge; keep personal devices outbound-only or Tailscale-only. Local ports remain acceptable for isolated development previews.
- Web/API/database/controller services may run on an authorized Linux host.
- Original videos, frames, generated images, provider downloads, QA evidence, and final MP4 files should use object storage rather than filling a small system disk.
- Treat 9 Mbps as peak bandwidth unless the provider contract guarantees sustained throughput. Do not use a constrained host as a video CDN or high-volume relay.
- Preserve the canonical Windows-owner and Mac-execution boundaries defined by `$master-control-router` and `$win-mac-codex-bridge`.

## Completion

State which alias and host identity were verified, what was read or changed, the backup/rollback fact, and what remains unverified. After any Skill, SSH-config, script, service, pipeline, or automation edit, run `$post-coding-review` before reporting completion.
