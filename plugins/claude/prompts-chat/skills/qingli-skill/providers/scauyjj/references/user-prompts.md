# User Prompts

Keep prompts short. Use layered disclosure:

1. one-line conclusion.
2. category summary.
3. top 3 examples.
4. details only if requested.

## Scan Summary

```text
Found about 18.6 GB that may be cleaned.

Low risk: 6.2 GB
Needs confirmation: 8.4 GB
Do not auto-clean: 4.0 GB

Recommended: Standard cleanup. It should not affect logins, documents, or chat history.
```

Offer at most three choices:

```text
1. Standard cleanup
2. Conservative cleanup
3. View details
```

## Cleanup Confirmation

```text
About to clean:
- Browser and app caches: about 3.1 GB
- Logs and error reports: about 1.4 GB
- Old installers and update cache: about 5.6 GB

Will not delete:
- chat history
- documents, photos, or videos
- software accounts or settings
- Windows core files
```

## Resume After Closing Apps

```text
Cleaned the items that were safe right now.

Still available after closing apps: about 620 MB
- Chrome cache: about 390 MB
- WPS cache: about 110 MB
- aTrust logs: about 100 MB

Close those apps and say "continue"; I can use the saved cleanup plan without scanning again.
```

## Deep Cleanup Confirmation

```text
Deep cleanup needs administrator permission and may take several minutes.

It will use official Windows cleanup tools.
It will not manually delete Windows system folders.
```

## Migration Prompt

```text
Found likely C-drive growth sources:

1. App data: 3.2 GB, safe to migrate after closing the app
2. Game library: 48 GB, better to move than delete
3. Phone backup: 22 GB, confirm before any action
```

## Completion Summary

```text
Cleanup complete.

C drive: 22.0 GB -> 29.9 GB
D drive: 497.5 GB -> 501.0 GB
Freed: about 11.4 GB

Skipped locked or high-risk files.
```

## Tone

- Avoid long technical explanations by default.
- Avoid showing more than three examples unless the user asks.
- Say "skipped" instead of "failed" when skipping for safety.
- Be explicit about what was not deleted.
