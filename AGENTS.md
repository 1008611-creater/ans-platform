# AGENTS.md

> **Core Brand Iron Rule**: **`ANS` stands exclusively for `AI Never Stops`** (never miswrite it as `AI Native Society` or `AI Native Studio` in any copy, code, diagram, or response).
> **No Fake/Scripted Skill Substitutes Rule**: When asked to use any external/open-source visual or cover Skill (`oil-cover`, `beautify-github-readme`, `oil-visual`, `oil-ui`, `GitGlow`, etc.), always install and follow the authentic upstream Skill repository (`SKILL.md`, `references/*`, `scripts/*`) and real generation pipeline (e.g., `image2.5genskill` / `gpt-image-2.5`). NEVER substitute an upstream visual Skill with a makeshift script that draws repetitive flat SVG boxes.
> **Mandatory Visual Quality Gate Rule**: Whenever generating covers or visual assets with `image2.5genskill` or any cover Skill, ALWAYS present sample outputs across the candidate styles to the user for visual inspection and explicit quality approval BEFORE replacing or deploying covers to the live site.
> **Mandatory Content & IP Consistency Rule**: Every ANS cover or illustration MUST match the actual website UI and actual ANS mascot (`public/mascot/ans-mascot.png`: chubby egg-shaped pastel mint-green `#9BE0C5` dinosaur with 3 rounded mint head bumps, 2 small round black dot eyes, wide cream-white `#FBF6E9` lower-face patch with a tiny smile, and round cream-white belly; or the live 3D widget variant wearing a pastel mint scarf and star antenna). Always pass a composite reference (`--ref`) containing the real page screenshot and `public/mascot/ans-mascot.png` into `image25_gen.py`; never rely on text-only prompts that hallucinate fake UIs or off-model dinosaurs.
> Product authority: docs/ANS权威产品与架构总纲.md, current 2026-10-15 revision. Load the relevant sections for the task. Primary navigation is project square, Hub, community growth, competitions, market and workspace; workflows remain an internal execution layer with no standalone discovery entry. Implement only authorized product changes; preserve authentication, accounting, private data, runtime APIs and applicable source notices.

> Guidelines for AI coding agents working on this project.

## Project Overview

**ANS (AI Never Stops)** is a project discovery, Hub, workflow, community, event and marketplace platform built with Next.js. The six primary destinations, in order, are /explore, /hubs, /community, /competitions, /market and /workspace. Preserve all six in desktop navigation, mobile navigation and the navigation drawer. Remove only the standalone workflow discovery entry; public /workflows directory/details redirect to market. Favorites and compute center belong to the account menu. Hubs organize explicitly related contents; immutable workflows execute personal inputs; reviewed marketplace listings bind the exact runnable version. Keep historical data and shared backend interfaces when retiring old prompt UI. Retained upstream code remains governed by its source licenses.

### Tech Stack

- **Framework:** Next.js 16.0.7 (App Router) with React 19.2
- **Language:** TypeScript 5
- **Database:** PostgreSQL with Prisma ORM 6.19
- **Authentication:** NextAuth.js 5 (beta) with pluggable providers (credentials, GitHub, Google, Azure)
- **Styling:** Tailwind CSS 4 with Radix UI primitives
- **UI Components:** shadcn/ui pattern (components in `src/components/ui/`)
- **Internationalization:** next-intl with 2 supported locales (`zh`, `en` — Chinese & English bilingual only)
- **Icons:** Lucide React
- **Forms:** React Hook Form with Zod validation

## Project Structure

```
/
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma       # Prisma schema definition
│   ├── migrations/         # Database migrations
│   └── seed.ts             # Database seeding script
├── public/                 # Static assets (logos, favicon)
├── messages/               # i18n translation files (en.json, es.json, etc.)
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── (auth)/         # Auth pages (login, register)
│   │   ├── [username]/     # User profile pages
│   │   ├── admin/          # Admin dashboard
│   │   ├── api/            # API routes
│   │   ├── categories/     # Category pages
│   │   ├── prompts/        # Prompt CRUD pages
│   │   ├── feed/           # User feed
│   │   ├── discover/       # Discovery page
│   │   ├── settings/       # User settings
│   │   └── tags/           # Tag pages
│   ├── components/         # React components
│   │   ├── admin/          # Admin-specific components
│   │   ├── auth/           # Authentication components
│   │   ├── categories/     # Category components
│   │   ├── layout/         # Layout components (header, etc.)
│   │   ├── prompts/        # Prompt-related components
│   │   ├── providers/      # React context providers
│   │   ├── settings/       # Settings components
│   │   └── ui/             # shadcn/ui base components
│   ├── lib/                # Utility libraries
│   │   ├── ai/             # AI/OpenAI integration
│   │   ├── auth/           # NextAuth configuration
│   │   ├── config/         # Config type definitions
│   │   ├── i18n/           # Internationalization setup
│   │   ├── plugins/        # Plugin system (auth, storage)
│   │   ├── db.ts           # Prisma client instance
│   │   └── utils.ts        # Utility functions (cn)
│   └── i18n/               # i18n request handler
├── prompts.config.ts       # Main application configuration
├── prompts.csv             # Community prompts data source
└── package.json            # Dependencies and scripts
```

## Commands

```bash
# Development
npm run dev              # Start development server (localhost:3000)
npm run build            # Build for production (runs prisma generate first)
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run database migrations
npm run db:push          # Push schema changes to database
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database with initial data

# Type checking
npx tsc --noEmit         # Check TypeScript types without emitting

# Translations
node scripts/check-translations.js  # Check for missing translations across locales
```

## Code Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use `interface` for object shapes, `type` for unions/intersections
- Functions: `camelCase` (e.g., `getUserData`, `handleSubmit`)
- Components: `PascalCase` (e.g., `PromptCard`, `AuthContent`)
- Constants: `UPPER_SNAKE_CASE` for true constants
- Files: `kebab-case.tsx` for components, `camelCase.ts` for utilities

### React/Next.js

- Use React Server Components by default
- Add `"use client"` directive only when client interactivity is needed
- Prefer server actions over API routes for mutations
- Use `next-intl` for all user-facing strings (never hardcode text)
- Import translations with `useTranslations()` or `getTranslations()`

### Component Pattern

```tsx
// Client component example
"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  const t = useTranslations("namespace");
  
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Button onClick={onAction}>{t("actionLabel")}</Button>
    </div>
  );
}
```

### Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design (`sm:`, `md:`, `lg:` breakpoints)
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Prefer Radix UI primitives via shadcn/ui components
- Keep component styling scoped and composable

### Database

- Use Prisma Client from `@/lib/db`
- Always include proper `select` or `include` for relations
- Use transactions for multi-step operations
- Add indexes for frequently queried fields

## Configuration

The main configuration file is `prompts.config.ts`:

- **branding:** Logo, name, and description
- **theme:** Colors, border radius, UI variant
- **auth:** Authentication providers array (credentials, github, google, azure)
- **i18n:** Supported locales and default locale
- **features:** Feature flags (privatePrompts, changeRequests, categories, tags, aiSearch)
- **homepage:** Homepage customization and sponsors

## Plugin System

Authentication and storage use a plugin architecture:

### Auth Plugins (`src/lib/plugins/auth/`)
- `credentials.ts` - Email/password authentication
- `github.ts` - GitHub OAuth
- `google.ts` - Google OAuth  
- `azure.ts` - Microsoft Entra ID

### Storage Plugins (`src/lib/plugins/storage/`)
- `url.ts` - URL-based media (default)
- `s3.ts` - AWS S3 storage

## Internationalization

- Translation files are in `messages/{locale}.json` (and namespace subfolders under `messages/*/zh.json` & `en.json`)
- Strictly supported across the entire ANS platform (including AgriHackathon): `zh`, `en` (Chinese & English bilingual only; never waste time editing or syncing legacy `ar/az/de/el/es/fa/fr/he/it/ja/ko/nl/pt/ru/tr` JSON files)
- Default locale is `zh`, switchable to `en` in header (`src/components/layout/header.tsx`)

## Key Files

| File | Purpose |
|------|---------|
| `prompts.config.ts` | Main app configuration |
| `prisma/schema.prisma` | Database schema |
| `src/lib/auth/index.ts` | NextAuth configuration |
| `src/lib/db.ts` | Prisma client singleton |
| `src/app/layout.tsx` | Root layout with providers |
| `src/components/ui/` | Base UI components (shadcn) |

## Boundaries

### Always Do
- Implement and verify authorized local changes, then report completed work and remaining limits. Commits, pushes, GitHub pull requests, publication and deployment require the user's explicit authorization for the current operation; do not infer it from implementation approval.
- Creating a PR does not authorize merging it or deploying to production; do those only when the user explicitly asks.
- Run `npm run lint` before committing
- Use existing UI components from `src/components/ui/`
- Add translations for all user-facing text
- Follow existing code patterns and file structure
- Use TypeScript strict types

### Ask First
- Database schema changes (require migrations)
- Adding new dependencies
- Modifying authentication flow
- Changes to `prompts.config.ts` structure

### Never Do
- Commit secrets or API keys (use `.env`)
- Modify `node_modules/` or generated files
- Delete existing translations
- Remove or weaken TypeScript types
- Hardcode user-facing strings (use i18n)

## Environment Variables

Required in `.env`:
```
DATABASE_URL=           # PostgreSQL connection string
AUTH_SECRET=            # NextAuth secret key
```

Optional OAuth (if using those providers):
```
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_AZURE_AD_CLIENT_ID=
AUTH_AZURE_AD_CLIENT_SECRET=
AUTH_AZURE_AD_ISSUER=
```

Optional features:
```
OPENAI_API_KEY=         # For AI-powered semantic search
```

## Verification

Automated tests use Vitest under `src/__tests__`; run relevant tests and type checks when the change warrants them. Choose validation from risk and affected surface instead of repeating the full suite. Place meaningful regression tests adjacent to source files or in `__tests__/`, use descriptive names, and mock external services such as the database and OAuth. Record verified and unverified areas.

## Common Tasks

### Adding a new page
1. Create route in `src/app/{route}/page.tsx`
2. Use server component for data fetching
3. Add translations to `messages/*.json`

### Adding a new component
1. Create in appropriate `src/components/{category}/` folder
2. Export from component file (no barrel exports needed)
3. Follow existing component patterns

### Adding a new API route
1. Create in `src/app/api/{route}/route.ts`
2. Export appropriate HTTP method handlers (GET, POST, etc.)
3. Use Zod for request validation
4. Return proper JSON responses with status codes

### Modifying database schema
1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate` to create migration
3. Update related TypeScript types if needed

## GPT-6.1 task routing and workflow architecture principles

See [`docs/adr/0003-agent-operating-model-gpt6.md`](docs/adr/0003-agent-operating-model-gpt6.md). Root rules define durable boundaries; implementation work loads the relevant modules, contracts, and ADRs on demand instead of reading the entire repository unconditionally.

- Route work as S/M/L/XL: local changes get local checks; cross-module changes confirm data flow, permissions, and state boundaries; permissions, billing, migrations, external integrations, and production release retain review, idempotency, failure handling, and rollback evidence.
- Definition of Done includes the requested behavior, risk-appropriate verification, fixed or recorded failures, clear unverified areas, and a known rollback entry. Continue authorized local work to that point without repeated approval requests.
- Choose lint, type checks, affected tests, builds, browser checks, or smoke checks from risk and impact. Do not repeat the full suite by default; repair failures caused by the current change and rerun affected checks.
- Keep project, workflow, and marketplace details and state separate. Workflows use immutable versions, reviewed publication, run snapshots, and real results; marketplace entries bind an explicit runnable version and service or purchase conditions.
- Market products show real outcomes, input requirements, delivery, price boundaries and exact reviewed versions around a specialized editor. /market/resume-website is the first canonical product. Shared internal execution owns confirmation, accounting, status, history and recovery; specialized editors own real artifacts. A staged form alone does not meet the market publication standard.
- Project-to-workflow conversion creates a private draft from public project material. It never executes external code or README instructions. Public projections contain bounded presentation only; prompts, private configuration, review drafts, and user input stay private.
- Show outcomes and next actions before steps and advanced settings. Mobile behavior, keyboard access, reduced motion, unsaved-exit protection, and error recovery are delivery requirements.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
