# 清理Skill 来源清单

四个上游仓库保留在工作区 `E:\codex\aisp\aidaihuo\.third-party\disk-cleanup-sources`，统一 Skill 内的 `providers` 是可发现、可执行的本地副本。

| Provider | GitHub | Commit | 集成范围 |
|---|---|---|---|
| `vhaozheng` | https://github.com/vhaozheng/windows-disk-cleanup | `03a494e5c09a42aaa91003d260d20751a6c9981d` | 扫描、基线比较、迁移建议、junction 迁移 |
| `scauyjj` | https://github.com/ScauYjj/windows-disk-cleaner-skill | `46822df1fdda597232de2143d5b460e1e44bae7e` | 风险分级扫描、清理计划、清理、迁移、定时维护 |
| `orzcls` | https://github.com/orzcls/win-disk-cleaner | `65f3a40cc9d473b79a1d2b5d2fe9717ddd4418ca` | PowerShell 模块化清理、干运行、缓存和系统维护模块 |
| `gccszs` | https://github.com/gccszs/disk-cleaner | `b8e02ce23c3c05c9aea3f70810e83418794a49f6` | Python 分析、渐进扫描、重复文件、监控、干运行清理 |

## Integration decisions

- Four providers are used together for read-only comparison and dry-run preview only.
- `scauyjj` is the default executor for ordinary Windows cleanup because it has explicit risk levels and reusable plans.
- `vhaozheng` is the default for growth comparison and migration decisions.
- `orzcls` hibernation, WinSxS, and restore-point modules are skipped during comparison unless explicitly selected.
- `gccszs` scans are bounded by sampling, file count, or time to avoid an unbounded full-drive scan.
- Upstream files are vendored without their `.git` directories; the original clones and commit pins remain available for provenance.
