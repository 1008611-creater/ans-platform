# Deployment Checklist

Before reporting launch readiness, record:

- Provider: Vercel, Netlify, Cloudflare Pages, Framer, GitHub Pages, or other.
- Preview URL and production URL if available.
- Build command and output directory.
- Required environment variables.
- Domain and DNS status.
- Rollback path when the site is business-critical.
- SEO/social metadata verification.
- Accessibility verification status.
- Performance/Core Web Vitals verification status.
- Security/privacy basics: CSP/header plan, env exposure, cookies/consent, third-party scripts.
- Error monitoring/observability status when app logic exists.
- CI status: build, lint, typecheck, tests, preview.
- Analytics/form verification status.
- Auth compatibility matrix when login/register/reset/code delivery exists.
- Publicly observed browser asset release/version and canonical auth API paths.
- Same-platform candidate health/readiness plus missing-module/native-runtime/Prisma-engine log scan for self-hosted containers.
- Bounded invalid-credential auth probe and authorized QA session journey; record real code delivery as verified or explicitly not verified.

Do not mark `status: launched` without a reachable URL and route-appropriate verification evidence.
