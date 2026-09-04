# Backend Database Admin Route

Use this reference when a website needs database, auth, backend APIs, uploads, payment, member/account areas, dashboards, or admin operations.

## Default Choices

- Use Next.js or an existing code-owned route when the site needs auth, data, API routes, uploads, payment, or admin.
- Use Framer/static route only when data/admin/backend needs are absent or embedded through a proven external service.
- Choose Supabase, Firebase, Postgres/Prisma, managed CMS, or existing backend according to repo and deployment context.
- Never expose service-role keys, database passwords, payment secrets, or admin tokens in frontend code.

## Core Website Data Resources

| Resource | Purpose |
| --- | --- |
| `users` / `profiles` | Account profile data. |
| `leads` / `submissions` | Forms, bookings, inquiries, waitlists. |
| `products` / `services` | Product/service catalog when dynamic. |
| `orders` / `payments` | Checkout/order/payment records. |
| `uploads` / `media` | Uploaded files media metadata. |
| `posts` / `pages` | CMS/content pages. |
| `settings` | Business/site settings, feature switches, SEO defaults. |

## Manifest Fields

```json
{
  "website": {
    "database": {
      "provider": "supabase",
      "url_env": "NEXT_PUBLIC_SUPABASE_URL",
      "tables": ["profiles", "leads", "orders"],
      "migrations_path": "supabase/migrations",
      "security_rules_recorded": true
    },
    "backend_api": {
      "base_url": "",
      "auth_provider": "",
      "upload_endpoint": "",
      "payment_create_order": "",
      "payment_notify_url": ""
    },
    "admin": {
      "required": true,
      "route": "/admin",
      "url": "",
      "smoke_test_record": "docs/verification/admin-smoke.md"
    }
  },
  "quality_gates": {
    "database_gate": "pending",
    "backend_api_gate": "pending",
    "admin_gate": "pending"
  }
}
```

## Verification Gate

Before database/backend/admin claims:

1. Schema/resources are recorded.
2. Env vars are recorded without exposing secret values.
3. Auth boundary is clear.
4. Form/upload/payment/admin mutations are server-owned where needed.
5. Admin route or URL is recorded when admin is claimed.
6. Smoke evidence exists in `verification_records`: `api_smoke_test`, `form_validation_check`, `admin_smoke_test`, or similar.
7. `database_gate` passes only with schema/resource/security evidence.
8. `backend_api_gate` passes only with API smoke evidence for relevant routes.
9. `admin_gate` passes only with route/URL plus `admin_smoke_test` or linked smoke record.
10. When auth exists, record the visible-page-to-canonical-API compatibility matrix and apply `auth-compatibility-release-gate.md`.
11. Migrated accounts require separate login-schema and new-password-schema tests; do not silently invalidate historical passwords by raising the login minimum.
12. Verification-code readiness distinguishes configured transport from an authorized real delivery test.

## Hard Failures

- Service-role key or database password in frontend code.
- Payment amount calculated only on frontend.
- Admin done without route/URL and smoke evidence.
- Database done without tables/resources security notes.
