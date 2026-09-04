# Source Repo Reuse

Use this reference when a website can reuse or learn from an existing GitHub repository, template, starter, theme, admin system, or top skill source.

## Reuse Mode

| Mode | Use when | Required proof |
| --- | --- | --- |
| `reference_only` | The repo informs architecture, design, or verification only. | `source_application_records` says reference only and lists the lesson. |
| `module_reuse` | Specific components, schema, admin flows, layouts, or API ideas are adapted. | Locked ref, changed files, replacement notes, smoke test. |
| `base_repo` | The repo becomes the starting codebase. | Locked ref, local path, removed demo data, replaced brand/domain/env/secrets, build/browser smoke tests. |

## Required Checks

1. Lock the exact repo/ref before using it.
2. Check license and commercial reuse constraints.
3. Record source in `source_repositories`.
4. Record how it changed the project in `source_application_records`.
5. Remove demo brand, fake content, sample domains, sample keys, fake analytics IDs, and fake payment settings.
6. Map reusable modules: pages, layouts, components, forms, auth, database, admin, uploads, analytics, deployment.
7. Verify build, browser screenshots, and any API/admin paths separately.

## Website Template Rule

- Use templates for structure, components, admin, forms, or data patterns.
- Do not keep template visual identity by default; brand/UI should be redesigned through `ui-quality-route.md`.
- Do not claim top GitHub skills/templates were used unless source records and changed artifacts exist.

## Manifest Records

```json
{
  "source_repositories": [
    {
      "name": "template-or-starter",
      "url": "https://github.com/example/template",
      "locked_ref": "",
      "used_for": ["layout", "components", "admin", "database"],
      "status": "applied",
      "local_path": ""
    }
  ],
  "source_application_records": [
    {
      "source": "template-or-starter",
      "applied_as": "base_repo",
      "changed": ["website.component_system", "website.database", "deployment"],
      "evidence": "docs/source-reuse/template-audit.md"
    }
  ],
  "quality_gates": {
    "source_application_gate": "pass"
  }
}
```
