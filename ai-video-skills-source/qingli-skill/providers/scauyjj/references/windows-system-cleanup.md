# Windows System Cleanup

Use official Windows mechanisms for system-owned components.

## Safe Official Actions

Use only with administrator permission and after explaining the effect:

- DISM component cleanup:
  - `Dism.exe /Online /Cleanup-Image /AnalyzeComponentStore`
  - `Dism.exe /Online /Cleanup-Image /StartComponentCleanup`
- Disk cleanup or Storage Sense for:
  - Windows Update cleanup.
  - Delivery Optimization.
  - Temporary files.
  - Error reports.
  - Previous Windows installation when present.
- Power configuration:
  - `powercfg /h off` only when the user accepts losing hibernation and Fast Startup.
- Restore points:
  - Use Windows tools or `vssadmin` only after the user confirms.

## Never Manually Delete

- `C:\Windows\WinSxS`
- `C:\Windows\Installer`
- `C:\Windows\System32`
- DriverStore.
- servicing session files.
- current CBS logs.
- active Windows Update databases.

## Windows Update Cache

Prefer official cleanup first. If a service-aware manual cleanup is needed:

1. Require administrator permission.
2. Stop Windows Update related services if allowed:
   - `wuauserv`
   - `bits`
   - `dosvc`
3. Clean download cache only, not the whole servicing stack.
4. Restart services.
5. Verify Windows Update still opens.

## Protected Directories

If deletion fails with Access Denied:

- Do not take ownership.
- Do not rewrite ACLs.
- Do not schedule boot-time deletion for system components.
- Report the size and recommend official tool or administrator maintenance.
