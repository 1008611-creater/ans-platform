---
name: computer-accelerator
description: name: computer-accelerator
---

---
name: computer-accelerator
description: Find process-level root causes and safely improve Windows computer performance, including CPU, memory pressure, disk I/O, temperatures, background processes, startup load, and stale development tasks. Use when the user says the computer is slow, freezes, becomes slower over time, has memory problems, needs health monitoring, or asks to install and apply System Informer, LibreHardwareMonitor, Mem Reduct, or Windows maintenance tools.
---

# Computer Accelerator

Use this skill to find the process-level cause of a Windows slowdown and produce a measured before/after result. Use the `Optimize` mode as the normal acceleration entry point: it classifies the current bottleneck, records CPU/I/O/memory evidence with process IDs and command lines, applies only evidence-backed safe actions, waits for the machine to settle, and verifies the result. Combine Windows-native counters with three optional tools: System Informer for process and I/O attribution, LibreHardwareMonitor for temperature and clock telemetry, and Mem Reduct for an explicit, manual memory-trim test. Treat WinUtil as an optional maintenance tool, never as an unattended optimizer.

## Workflow

1. Run the adaptive optimization entry point:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$skillRoot\scripts\accelerate_windows.ps1" -Mode Optimize -OutputPath "$env:TEMP\computer-accelerator-optimize.json"
```

 This command captures the baseline, classifies CPU/memory/disk pressure, lowers only the exact evidence-backed background watcher processes when CPU or disk pressure is present, stops only safe read-only scan processes when disk pressure is present, waits for the system to settle, and writes a verification result with `Outcome` set to `Improved`, `NoOptimizationNeeded`, `NoSafeAction`, or `NotResolved`.

When the user reports intermittent lag but a single snapshot is normal, monitor while reproducing it:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$skillRoot\scripts\accelerate_windows.ps1" -Mode Monitor -DurationSeconds 60 -OutputPath "$env:TEMP\computer-accelerator-monitor.json"
```

`Monitor` is read-only. It records peak CPU, disk queue/latency, hard page reads, DPC/interrupt time, and the processes observed at the peaks; it does not stop anything. It marks WMI and PowerShell sampling overhead separately so the diagnostic process is not mistaken for the user's root cause.

For low-level inspection, capture a baseline before changing anything:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$skillRoot\scripts\accelerate_windows.ps1" -Mode Snapshot -OutputPath "$env:TEMP\computer-accelerator-before.json"
```

To explicitly schedule the confirmed background watchers without stopping them:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$skillRoot\scripts\accelerate_windows.ps1" -Mode Schedule -OutputPath "$env:TEMP\computer-accelerator-schedule.json"
```

`Schedule` changes only the priority of processes whose complete command line matches the confirmed bridge watcher, Codex log watcher, or active `sqlite3` `logs_2.sqlite` `session_loop` query. It records the PID, complete command line, original priority, and new priority in `%TEMP%\computer-accelerator-schedule-state.json`. Restore the saved priorities with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$skillRoot\scripts\accelerate_windows.ps1" -Mode RestoreSchedule -OutputPath "$env:TEMP\computer-accelerator-restore-schedule.json"
```

2. Classify the bottleneck from the snapshot or `Optimize` diagnosis:

- CPU pressure: total processor time is sustained above 85% and one or more processes explain it.
- Memory pressure: available memory is below 2048 MB, commit is near its limit, or one process keeps growing across two snapshots.
- Paging pressure: available memory is below 4096 MB and hard page reads are sustained above 20/sec; ordinary soft page faults alone do not qualify.
- Disk pressure: a logical disk queue stays above 2 or average transfer latency stays above 20 ms.
- Thermal pressure: hardware telemetry shows sustained high temperature with clock reduction.
- Hardware fault pressure: unhealthy physical-disk status or recent storage/WHEA warning and error events are present.
- Scheduling pressure: sustained DPC or interrupt time is high; use a trace tool for driver attribution before changing anything.
- Log-watcher pressure: a large Codex `logs_2.sqlite` database is being polled by `resume-codex-app-threads.ps1 -Watch`; inspect retention before changing or deleting logs.
- Long-running watcher pressure: a project bridge, file watcher, hot-reload process, or sync loop with `--watch`/`-Watch` has a high CPU or I/O peak; identify its project role before pausing it.
- Background-task pressure: stale read-only scans, known disk analyzers, duplicate development servers, tests, sync clients, Docker/WSL, or browser automation are active. A Codex read-only scan running for at least 30 seconds is treated as stale and may be stopped even if the instantaneous disk queue has temporarily fallen.

3. Apply only an evidence-backed, reversible action. The adaptive entry point may stop a Codex-launched `robocopy` command only when its command line contains `/L`, `/S`, and `/BYTES`; stop a Codex-launched `Get-ChildItem`/PowerShell command that recursively searches a whole drive root when it is stale or causing disk pressure; or stop the exact `Krokiet`, `WizTree`, or `WizTree64` process when the current baseline shows high disk queue or transfer latency. These are scan processes, not file operations. Do not stop arbitrary processes, Docker/WSL, development servers, security software, or user applications.

When CPU or disk pressure is present, `Optimize` may also lower the priority of the four exact watcher patterns identified in the measured diagnosis. This preserves the watcher functionality and is reversible through `RestoreSchedule`; it does not change configuration, services, registry settings, log files, or power settings.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$skillRoot\scripts\accelerate_windows.ps1" -Mode Apply -StopReadonlyScans -OutputPath "$env:TEMP\computer-accelerator-apply.json"
```

For a measured disk-scan bottleneck, add the explicit observed-scanner action:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$skillRoot\scripts\accelerate_windows.ps1" -Mode Apply -StopObservedDiskScanners -OutputPath "$env:TEMP\computer-accelerator-apply.json"
```

4. Verify and report the real change:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$skillRoot\scripts\accelerate_windows.ps1" -Mode Verify -OutputPath "$env:TEMP\computer-accelerator-after.json"
```

Compare `Outcome`, `RootCauseCandidates`, CPU, available memory, page-read rate, physical-disk health, storage/WHEA fault signals, DPC/interrupt time, Codex log health, per-volume queue length, average latency, top CPU/I/O processes, and the targeted scan lists. For intermittent symptoms, use `Monitor` peaks instead of a single average. `RootCauseCandidates` are evidence-backed candidates, not proof of causality; a candidate is actionable automatically only when `SafeAutomaticAction` is true. Never delete, compact, or rotate a large Codex log database automatically. `Improved` means at least one pressure class present before the action cleared after it. `NoSafeAction` means pressure remains but the skill found no safe automated action; report the named process and its measured evidence instead of killing it. If verification still attributes pressure to a protected Codex/ChatGPT process or another non-schedulable process, keep the result as `NotResolved`, report that process and its measured evidence, and do not broaden the scheduling target set automatically. Never claim optimal performance from a successful command alone.

## Tool integration

Use the official package sources listed in [references/toolchain.md](references/toolchain.md). Install tools only through the explicit `InstallTools` mode after the user requests the integrated toolchain:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$skillRoot\scripts\accelerate_windows.ps1" -Mode InstallTools
```

Do not enable automatic memory cleaning by default. Mem Reduct changes Windows cache and working-set state through native APIs; use it only as a manual diagnostic experiment after recording a baseline. If memory returns to the same level immediately, identify the leaking process instead of scheduling more cleaning.

## Safety boundaries

- Never delete Desktop, Documents, Downloads, media, backups, chat databases, project files, or browser profiles.
- Never modify the registry, pagefile, services, boot configuration, Defender settings, Windows component storage, or power limits automatically.
- Never run WinUtil's full tweak/debloat/update surface as part of acceleration.
- Never run a cleanup tool just because free space is low; first identify the path and measure the effect.
- Never lower priority for a process based only on its name; scheduling requires an exact command-line match and a saved PID/command-line state record.
- Never restore a saved priority when the PID no longer has the same complete command line; report the mismatch instead.
- Preserve both before and after JSON snapshots when claiming an improvement.
- Treat "optimal" as the best measured state reachable through the current safe action set; do not promise that one run can solve an external workload, thermal limit, hardware fault, or user application leak.
- If a tool is not installed, report that fact and continue with Windows-native diagnostics.

## Resources

- `scripts/accelerate_windows.ps1`: deterministic snapshot, targeted safe action, verification, and official-tool installation.
- `references/toolchain.md`: project roles, package identifiers, and operational caveats.
