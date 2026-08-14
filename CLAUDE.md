# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project overview

DuHoc24 — a sample "Study-Abroad Application Portal" (Cổng Tiếp Nhận Hồ Sơ Du Học) built for a 6-week teaching curriculum (see [README.md](README.md) for the week-by-week feature roadmap in Vietnamese). The current state is **UI-only**: every page renders from hardcoded mock data in [`lib/mock-data.ts`](lib/mock-data.ts) — there is no database, auth, or API integration yet. Don't wire up real persistence, Supabase, or auth unless explicitly asked; the mock-data layer is intentional for this stage of the course.

## Commands

```bash
npm install       # node_modules is not checked in — run this first
npm run dev        # start dev server at http://localhost:3000
npm run build       # production build
npm run start       # serve the production build
npm run lint         # eslint (flat config, eslint-config-next)
```

There is no test suite configured in this repo.

## Architecture

**Stack**: Next.js App Router (v16, TypeScript) + Tailwind CSS v4 + shadcn/ui (`base-nova` style, built on Base UI, see [components.json](components.json)). Path alias `@/*` maps to the repo root ([tsconfig.json](tsconfig.json)).

**Three route groups**, all under [app/](app):
- `/` — public landing page ([app/page.tsx](app/page.tsx)): hero, quote form, chatbot widget (static UI), highlights — composed from [components/landing/](components/landing)
- `/portal` — student-facing document portal ([app/portal/page.tsx](app/portal/page.tsx)), reads from the single hardcoded `currentStudent` object in `lib/mock-data.ts`; components in [components/portal/](components/portal)
- `/admin/*` — internal dashboard sharing [app/admin/layout.tsx](app/admin/layout.tsx), which renders `AdminSidebar`/`AdminMobileNav` from [components/admin/sidebar.tsx](components/admin/sidebar.tsx). Adding a new admin page means adding both a route under `app/admin/` and an entry in the `adminNavItems` array in that file.

**Data layer**: [lib/mock-data.ts](lib/mock-data.ts) is the single source of truth for all entities (`School`, `AdmissionRequest`, `StudentProfile`, `Conversation`, `ServiceOption`) and their status-enum types (`DocStatus`, `RequestStatus`, `ServicePackage`). Every page/component imports directly from here rather than fetching. When adding a feature, extend this file rather than inventing a parallel data source.

**Status badges**: `DocStatus` and `RequestStatus` values are rendered via a tone system in [components/status-badge.tsx](components/status-badge.tsx) — each enum value maps to a `{ label, tone, icon }` entry in `docStatusMeta`/`requestStatusMeta`, consumed by `DocStatusBadge`/`RequestStatusBadge`. Add new statuses by extending these maps, not by writing one-off badge markup.

**UI primitives**: [components/ui/](components/ui) holds shadcn-generated primitives (button, card, table, input, select, etc.) — treat these as generated/vendor code; prefer composing them over hand-rolling equivalents. `iconLibrary` is `lucide-react`. The `@tailark-oss` registry (see `components.json`) is the source for larger pre-built landing blocks (e.g. the hero section is adapted from `@tailark-oss/dusk-landing-2`).

**Env vars**: [.env.example](.env.example) lists variables for Supabase and magic-link auth, but none are required for `npm run dev` today — they're scaffolding for later weeks of the course (see README roadmap).

## Quy tắc Git

- Luôn hỏi xác nhận trước khi push lên Github
- Không bao giờ commit file .env hoặc bất kỳ file chứa API key
