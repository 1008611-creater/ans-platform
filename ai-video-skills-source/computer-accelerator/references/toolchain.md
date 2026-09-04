# Windows Performance Toolchain

Use official GitHub repositories or the Windows Package Manager (`winget`) source only.

| Tool | Official repository | Winget ID | Role | Boundary |
| --- | --- | --- | --- | --- |
| System Informer | https://github.com/winsiderss/systeminformer | `WinsiderSS.SystemInformer` | Attribute CPU, memory, disk I/O, handles, services, startup, and network activity | Inspect first; do not terminate processes without a named target |
| LibreHardwareMonitor | https://github.com/LibreHardwareMonitor/LibreHardwareMonitor | `LibreHardwareMonitor.LibreHardwareMonitor` | Read CPU/GPU/SSD temperature, fan, voltage, load, and clock telemetry | Use as telemetry; sensor support varies by motherboard |
| Mem Reduct | https://github.com/henrypp/memreduct | `Henry++.MemReduct` | Manual memory/cache trim experiment | Requires administrator rights; not a cure for leaks and not an automatic default |
| WinUtil | https://github.com/ChrisTitusTech/winutil | not required | Optional one-time Windows maintenance and repair | Do not run the full tweak/debloat surface automatically |
| smartmontools | https://github.com/smartmontools/smartmontools | not required | Read SMART/NVMe health, media errors, wear, and power-on data | Read-only health inspection; controller support varies and output must be parsed per device |
| CrystalDiskInfo | https://github.com/hiyohiyo/CrystalDiskInfo | not required | Human-readable SMART/NVMe health and temperature view | Optional visual inspection; do not use its alert or resident features as an automatic optimizer |
| DiskSpd | https://github.com/microsoft/diskspd | not required | Controlled storage test to separate device capability from background I/O | Never run automatically; tests generate load and need an explicit target, duration, and idle window |

## Interpretation

Windows using otherwise available RAM as cache is normal. A low “free” number alone is not proof of a memory problem. Prefer commit growth, available memory, hard faults, process private bytes, and responsiveness over a before/after free-memory number.

For this computer, a previous verified incident showed memory was available while E: had a high I/O queue. Prioritize disk I/O attribution and stale background tasks before memory cleaning.

## Bottom-up diagnosis layers

1. Attribute the symptom to a process and resource with Windows counters, process IDs, command lines, and a time window.
2. Check whether the storage device itself is healthy before tuning workloads: physical-disk health, SMART/NVMe data, storage errors, and WHEA events.
3. Separate memory capacity from paging: available memory, commit, hard page reads, and the growing process matter more than cache size.
4. Separate application CPU from driver latency: DPC/interrupt counters can flag a scheduling problem, while WPR/WPA or LatencyMon is needed for driver attribution.
5. Apply one reversible action, wait for the system to settle, and require the same signal to improve in the after snapshot.
6. Keep startup/task inventory and system repair read-only by default. Autoruns, DISM, SFC, and task-scheduler inspection are diagnosis or explicitly requested repair steps, not unconditional acceleration.
