# Wizstar Account File

Use `data/accounts.local.json` for the local account pool. The file is intentionally not described in final answers beyond its path and count.

Account format:

```json
[
  {
    "email": "google-account@example.com",
    "password": "password",
    "recovery": "recovery@example.com"
  }
]
```

Use `--account-index 0` for the first account. Use `--account-email <email>` when the user names a specific account.
