# Server Fleet Registry

Updated: 2026-08-03 Asia/Shanghai. This file contains no credentials.

## Connection Table

| Alias | Endpoint | User | Identity file | Role/status | Last verification |
|---|---|---|---|---|---|
| `haika-niannian` | `103.85.227.94:22` | `root` | `C:\Users\lsb\.ssh\haika_niannian_ed25519` | Current authoritative `ai.cauai.fun` NianNian host; Cloudflare Tunnel `haika-niannian-primary`; public static root `/var/www/niannian-ai`; key-only root recovery path | Root BatchMode SSH, service and route readback, 2026-08-03 |
| `haika-niannian-admin` | `103.85.227.94:22` | `niannian-admin` | `C:\Users\lsb\.ssh\haika_niannian_ed25519` | Non-root administrator for the current authoritative Haika NianNian host; key-only sudo recovery path | Admin BatchMode SSH + `sudo -n`, 2026-07-17 |
| `haika-kidswear-1757` | `38.76.193.254:22` | `root` | `C:\Users\lsb\.ssh\haika_niannian_ed25519` | Current `dh.cauai.fun` Kidswear Web/Worker/private-media production host (`#server-1757`); `kidswear-production` Tunnel connector and Web upstream active | Root BatchMode SSH, runtime and `/access` readback, 2026-07-31 |
| `psyidc-liuliang5` | `103.236.92.40:38961` | `root` | `C:\Users\lsb\.ssh\psyidc_liuliang5_ed25519` | Former PsyIDC production host retained for rollback data and unrelated-service audit; Kidswear writers, NianNian, WeCom bot, and old canvas connector are stopped | Live SSH, 2026-07-20 |
| `psyidc-kidswear-24638` | `103.236.71.108:64705` | `root` | `C:\Users\lsb\.ssh\psyidc_kidswear_24638_ed25519_v2` | Former PsyIDC rollback host; not a deployment target for `ai.cauai.fun`; historical NianNian services are inactive | Root BatchMode SSH, historical rollback audit, 2026-08-03 |
| `psyidc-windows` | `103.236.92.199:22` | `Administrator` | `E:\codex\aisp\aidaihuo\_server_tools\navos_103_236_92_199\codex_navos_server_ed25519` | PsyIDC Windows host; paused Kidswear site, Cloudflare tunnel, historical Navos/BitBrowser seat | Live SSH, 2026-07-16 |
| `tencent-niannian` | `43.133.254.221:22` | `ubuntu` | `C:\Users\lsb\.ssh\tencent_niannian_deploy_ed25519` | Tencent Seoul host; active NianNian workbench/worker and other shared services | Live SSH, 2026-07-16 |
| `niannian-mac` | Tailscale `100.68.119.126:22` | `lsb` | `C:\Users\lsb\.ssh\niannian_mac_admin_ed25519` | Protected Mac execution endpoint, not a public server | Bridge evidence, 2026-07-16 |

## Current NianNian Public Route

- `ai.cauai.fun` -> Cloudflare Tunnel `haika-niannian-primary` -> `haika-niannian` -> local Nginx `127.0.0.1:18082`.
- The current public NianNian deployment target is `haika-niannian`. Do not route website deployment to `psyidc-kidswear-24638`, `psyidc-liuliang5`, `tencent-niannian`, or a local machine based on older records.
- The route and service were read back on 2026-08-03. The active public static root is `/var/www/niannian-ai`, backed by the versioned release directory under `/srv/niannian-data/releases/`.

## Haika Cloud Hong Kong Host

- Provider instance: `#server-1633`; instance name `ser087508269396`.
- Region/product: China Hong Kong, `香港|四区·轻量 8-8 9Mbps`.
- OS: Ubuntu 22.04 x64.
- Capacity: 8 vCPU, 8 GB RAM, 50 GB system disk, 100 GB data disk.
- Network: VPC, one public IP, 9 Mbps peak bandwidth.
- Billing: monthly; created 2026-07-16, current term ends 2026-08-16.
- SSH: TCP 22 reachable. `haika-niannian` and `haika-niannian-admin` both passed `BatchMode=yes` with the dedicated key. Password and keyboard-interactive SSH login are disabled; root permits keys only.
- Dedicated public-key fingerprint: `SHA256:6a6DkNgmjThVmT84l/Rxk4Nb5P1FVuHThjyB1HcaH9I`.
- Captured host-key fingerprint: `SHA256:3m9aF2QQIyh3y3OLttMULKMeug4WUnzq26EtbFpiPtQ`; captured from the live endpoint, not independently verified by the provider.
- Data disk: existing clean ext4 `/dev/vdb1`, UUID `5b409214-2dd0-4bce-ae7d-ed08df81eafa`, mounted by UUID at `/srv/niannian-data` with `nosuid,nodev,noexec`; available capacity was about 93 GB after mount. Directories `media`, `artifacts`, `backups`, and `staging` exist but contain no production data.
- Security baseline: UFW enabled with default deny incoming/default allow outgoing and port 22/tcp allowed; NTP synchronized; SSH settings backed up under `/root/niannian-onboarding-20260717` before hardening. The initial system patch cycle and its authorized reboot completed on 2026-07-17; root/admin BatchMode access, UUID data-disk remount, SSH policy, and firewall were revalidated after boot.
- Backup/rollback: SSH configuration backups exist locally on the host; versioned NianNian static releases and application backups are present on the data disk. Provider snapshot creation and restore-drill evidence remain unknown and are tracked separately from the already active website deployment.
- Current NianNian role: authoritative public website and control-plane host for `ai.cauai.fun`. The active `niannian-ai.service` runs from `/opt/niannian-ai`; the public static release is served through `/var/www/niannian-ai` on the `haika-niannian-primary` tunnel route.
- Current rollback: `/opt/niannian-ai-releases/niannian-web-20260802-home-header-recovery-r2` remains the prior static target; the current browser-studio release and its public readback are recorded in the authority evidence package.

## Former PsyIDC Production Host (20923)

- Ubuntu 22.04, 4 vCPU, about 3.8 GB RAM, 29 GB system disk.
- Fresh 2026-07-16 disk state: about 28 GB used, 1.6 GB free, 95% full.
- Retained for rollback data only. Kidswear Web/Worker, `niannian-ai.service`, `wecom-ai-cs-bot.service`, and `cloudflared-canvas.service` are stopped and disabled.
- Its Kidswear PostgreSQL, Redis, and object-storage containers remain as rollback data. Do not delete them without a separately authorized retention and restore audit.
- `mihomo-sub2api.service` remains active and needs a separate ownership audit before any migration, shutdown, or cleanup. Do not infer that it is the Tencent Seoul Sub2API production service.
- Major usage: `/var/lib/containerd` about 15 GB; do not add media or delete images/data without tracing ownership and recovery.
- Backup/rollback: application-level releases and some timers exist; independently verified production-data restore remains unknown.

## PsyIDC Legacy Ingress / Rollback Host (24638)

- Provider instance: `#server-24638`; Ubuntu 22.04, 4 vCPU, 4 GB RAM, approximately 30 GB system disk, no separate data disk.
- SSH: use `psyidc-kidswear-24638` only for historical rollback inspection. It resolves to the provider's remote SSH mapping on port `64705`; root BatchMode key access was verified on 2026-07-19. The captured SSH ED25519 host-key fingerprint is `SHA256:2Jpkp2YBVjXuU2IRkMDFydLHkN0QOZsdEnlrCEn/kds` and remains provider-unverified.
- Current role: retained legacy ingress and rollback evidence for Kidswear and unrelated services. It is explicitly not an `ai.cauai.fun` or `dh.cauai.fun` deployment target. The historical `niannian-ai.service` is inactive, and its old local proxy target `127.0.0.1:19082` is unavailable.
- Public route correction: the old `psyidc-24638-niannian` route is retired for NianNian. Do not infer any current `ai.cauai.fun` route from this host's stale Nginx configuration or historical tunnel records.
- Cutover evidence: PostgreSQL aggregate counts, wallet totals, ledger counts, final-video nodes, and the object-storage content manifest matched the source at final cutover on 2026-07-20. Public Kidswear readiness and NianNian origin returned HTTP 200 after source writers/connectors were stopped.
- Rollback: 20923 retains source data and pre-cutover backups on 24638 are retained. Do not delete rollback artifacts until a separately authorized recovery-retention decision.

## Haika Kidswear Production Host (1757)

- Provider instance: `#server-1757`; public IP `38.76.193.254`; verified hostname `ser454500072169`; Ubuntu Linux.
- Current role: the authoritative `dh.cauai.fun` Kidswear Web, Worker, and private-media production host. Release routing for that public host must use `haika-kidswear-1757`.
- Runtime: Compose project `kidswear-haika` at `/srv/kidswear-data/staging/kidswear-migration-20260729`; Web container `kidswear-haika-web-1`, Worker container `kidswear-haika-worker-1`, and Web upstream `127.0.0.1:8791`.
- Ingress: the active `kidswear-production` Cloudflare Tunnel connector is on this host; its Web upstream returns `/access` successfully. Do not record or inspect Tunnel credentials.
- Verification: strict-host-checking and BatchMode SSH passed; the current Web image was healthy and local `/access` returned HTTP 200 on 2026-07-31.
- Rollback: retain the previous Web image and switch only the Web service if a versioned candidate fails health or browser acceptance. Keep Worker and data services unchanged for Web-only releases.

## PsyIDC Windows Host

- Windows 10 Pro, 4 vCPU, 4 GB RAM, 50 GB system disk; about 10.49 GB free at 2026-07-16 readback.
- Active paused-project service: `C:\sites\kidswear-ai-video-site\server.js` on port 8767 via scheduled task `KidswearAiVideoSite`.
- Other roles: Cloudflare tunnel and historical Navos/BitBrowser programmable seat.
- Application-level backups exist, but full-system snapshot/restore evidence is unknown.
- Do not reinstall until the public route, tunnel, site state, media, configuration presence, Navos profiles, scheduled tasks, and recovery plan are preserved.

## Tencent Seoul Host

- Ubuntu Linux host `VM-0-13-ubuntu`, 4 vCPU, about 7.5 GB RAM, 120 GB ext4 system disk.
- Fresh 2026-07-16 capacity: about 56 GB used, 58 GB available, 50% full.
- Active NianNian components: healthy video-workbench app, video worker, and PostgreSQL container.
- Other active/shared roles: Sub2API with PostgreSQL/Redis, paused ANS container on loopback 4194, Nginx, Cloudflare Tunnel, Hermes gateways, and a loopback QR portal.
- Public listeners include server-side 80/443 and SSH 22; application ports are primarily loopback-bound.
- Candidate role: NianNian asynchronous execution/worker and warm-standby node after exact service ownership and backup paths are preserved. Do not move the primary database or redirect traffic merely from this capacity readback.
- Backup/rollback: current application/container recovery and production-data restore evidence require a separate fresh audit.

## Connection Examples

```powershell
ssh -G haika-niannian
ssh -o BatchMode=yes haika-niannian "hostname"
ssh -o BatchMode=yes haika-niannian-admin "sudo -n id -u"
ssh -o BatchMode=yes psyidc-liuliang5 "hostname"
ssh -o BatchMode=yes psyidc-windows "hostname"
ssh -o BatchMode=yes tencent-niannian "hostname"
ssh -o BatchMode=yes niannian-mac "hostname"
```

Never write a provider-panel or initial SSH password into a command, script, prompt, Skill, or log. The current Haika aliases are key-only; use the provider console only as an emergency recovery path.
