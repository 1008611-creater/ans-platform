# CLAUDE.md

> Quick reference for Claude Code when working on ANS (**AI Never Stops**).
> **Brand Iron Rule**: `ANS` stands exclusively for **`AI Never Stops`** (never write `AI Native Society` or `AI Native Studio`).

## Project Overview

**ANS (AI Never Stops)** is an AI project discovery, Hub, workflow execution, community, competition, and marketplace platform built with Next.js 16 App Router, React 19, TypeScript, and PostgreSQL/Prisma. The six primary destinations are `/explore`, `/hubs`, `/community`, `/competitions`, `/market`, and `/workspace`.

For detailed agent guidelines, see [AGENTS.md](AGENTS.md).

## Quick Commands

```bash
# Development
npm run dev              # Start dev server at localhost:3000
npm run build            # Production build (runs prisma generate)
npm run lint             # Run ESLint

# Database
npm run db:migrate       # Run Prisma migrations
npm run db:push          # Push schema changes
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database

# Type checking
npx tsc --noEmit         # Check TypeScript types
```

## Key Files

| File | Purpose |
|------|---------|
| `prompts.config.ts` | Main app configuration (branding, theme, auth, features) |
| `prisma/schema.prisma` | Database schema |
| `src/lib/auth/index.ts` | NextAuth configuration |
| `src/lib/db.ts` | Prisma client singleton |
| `messages/*.json` | i18n translation files |

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── (auth)/       # Login, register
│   ├── api/          # API routes
│   ├── prompts/      # Prompt CRUD pages
│   └── admin/        # Admin dashboard
├── components/       # React components
│   ├── ui/           # shadcn/ui base components
│   └── prompts/      # Prompt-related components
└── lib/              # Utilities and config
    ├── ai/           # OpenAI integration
    ├── auth/         # NextAuth setup
    └── plugins/      # Auth and storage plugins
```

## Code Patterns

- **Server Components** by default, `"use client"` only when needed
- **Translations:** Use `useTranslations()` or `getTranslations()` from next-intl
- **Styling:** Tailwind CSS with `cn()` utility for conditional classes
- **Forms:** React Hook Form + Zod validation
- **Database:** Prisma client from `@/lib/db`

## Before Committing

1. Run `npm run lint` to check for issues
2. Add translations for any user-facing text
3. Use existing UI components from `src/components/ui/`
4. Never commit secrets (use `.env`)

## Mandatory UI/UX & Copy Baseline (`ans-ui-ux-baseline` = `oil-ui` + `oil-frontend` + `ui-ux-guide` + `oil-tone`)

1. **Zero Fake State Masquerading as Real Activity**: Never render fabricated live winner tickers, fake user tasks/orders, or fake stats pretending to be real activity. Any preset sample must be framed as `📖 新手引导 / 参考范例`, while user state is 100% real.
2. **Help Text Layering (L0–L3, Hover to Reveal)**:
   - **L0**: Self-explanatory buttons/layouts must NOT have explanatory small print (`text-[10px]`/`text-[11px]` captions, `（点击展开）`, `（拖拽旋转）`).
   - **L2 (Hover-to-Reveal)**: Secondary parameters, explanations, and tips are hidden by default and only revealed on hover (`group-hover` / `title` / `?` tooltip).
   - **L3**: Long rules, probability tables, and samples are collapsed into `<details>` or on-demand drawers.
3. **Image-First & Zero Redundancy**: When a visual cover or 3D stage already communicates the content, do not repeat it in multi-line text below, do not repeat the same rule (`10 积分 = ¥1 元`) multiple times on one page, and keep only one primary CTA per card.
4. **Zero AI-Flavor & Clean Naming**: Ban pretentious jargon (`赋能`, `矩阵`, `闭环`, `底座`, `四段式`, `主理人`, `欧皇`, `天选锦鲤`, `暴击`). Always call the in-site assistant **`Agent`** (never expose internal codenames `Pi Agent`, `Pi-Agent`, `Pi-Codex`, `Pi Tool` in user-facing UI) and call the studio workspace **`工作模式`**.

