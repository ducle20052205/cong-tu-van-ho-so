# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project overview

DuHoc24 — a sample "Study-Abroad Application Portal" (Cổng Tiếp Nhận Hồ Sơ Du Học) built for a 6-week teaching curriculum (see [README.md](README.md) for the week-by-week feature roadmap in Vietnamese). Most pages still render from hardcoded mock data in [`lib/mock-data.ts`](lib/mock-data.ts) (schools, student profiles) — there is no auth yet. Two exceptions are wired to real backends: the landing-page chatbot (real Gemini + Supabase) and the landing-page quote form (real pricing + Supabase) — see Architecture below. Don't wire up further real persistence, Supabase tables, or auth beyond what's already there unless explicitly asked; the mock-data layer is intentional for the rest of this stage of the course.

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

**Data layer**: [lib/mock-data.ts](lib/mock-data.ts) is the single source of truth for the remaining mock entities (`School`, `StudentProfile`) and shared status-enum types (`DocStatus`, `RequestStatus`, `ServicePackage`) plus the `servicePackages` price list (the one authoritative source for package pricing — read by both the quote API and the landing-page cards). `AdmissionRequest`/`Conversation` types and their mock arrays are no longer read anywhere (superseded by the real Supabase-backed data below) — left in place for reference, not a data source to extend. When adding a feature, extend `lib/mock-data.ts` rather than inventing a parallel mock source.

**Status badges**: `DocStatus` and `RequestStatus` values are rendered via a tone system in [components/status-badge.tsx](components/status-badge.tsx) — each enum value maps to a `{ label, tone, icon }` entry in `docStatusMeta`/`requestStatusMeta`, consumed by `DocStatusBadge`/`RequestStatusBadge`. Add new statuses by extending these maps, not by writing one-off badge markup.

**UI primitives**: [components/ui/](components/ui) holds shadcn-generated primitives (button, card, table, input, select, etc.) — treat these as generated/vendor code; prefer composing them over hand-rolling equivalents. `iconLibrary` is `lucide-react`. The `@tailark-oss` registry (see `components.json`) is the source for larger pre-built landing blocks (e.g. the hero section is adapted from `@tailark-oss/dusk-landing-2`).

**Chatbot persistence**: the landing-page chat widget ([components/landing/chat-widget.tsx](components/landing/chat-widget.tsx)) is backed by [app/api/chat/route.ts](app/api/chat/route.ts) (Gemini, model set by the `GEMINI_MODEL` constant) and [lib/chat-store.ts](lib/chat-store.ts) (Supabase tables `chat_conversations`/`chat_messages`). A visitor is identified by an httpOnly `chat_conversation_id` cookie set by the route handler — the widget never talks to Supabase directly and never sends conversation history itself; the server derives history from the DB. Both tables have RLS enabled with **no policies**, so only `SUPABASE_SECRET_KEY` (used exclusively in `lib/chat-store.ts`, a server-only module guarded by the `server-only` import) can read/write them — the browser-facing `SUPABASE_PUBLISHABLE_KEY` always gets zero rows. `/admin/conversations` reads the same tables via `listConversationsWithMessages()` to show real visitor conversations. Don't add a client-side Supabase client or expose `SUPABASE_SECRET_KEY` to any Client Component.

**Quote form persistence**: the landing-page quote form ([components/landing/quote-form.tsx](components/landing/quote-form.tsx)) posts to [app/api/quote/route.ts](app/api/quote/route.ts), which is the **only** place package prices are looked up for real quotes (`PACKAGE_PRICES` — keep this in sync with `servicePackages` in `lib/mock-data.ts`) — never trust a price sent by the client. Requests are saved via [lib/quote-store.ts](lib/quote-store.ts) (Supabase table `quote_requests`, same server-only/RLS-with-no-policies pattern as the chat tables). `/admin/requests` reads real rows via `listQuoteRequests()`; the Duyệt/Từ chối buttons ([components/admin/request-actions.tsx](components/admin/request-actions.tsx)) call the Server Action in [app/admin/requests/actions.ts](app/admin/requests/actions.ts) (`setQuoteRequestStatus`), which updates the row and calls `revalidatePath("/admin/requests")` — no separate API route or client-side Supabase call needed for this mutation.

**Env vars**: [.env.example](.env.example) lists variables for Supabase, Gemini, and magic-link auth. `GEMINI_API_KEY` and the `SUPABASE_*` server keys are required for the chatbot and quote form; the rest are scaffolding for later weeks of the course (see README roadmap).

## Quy tắc Git

- Luôn hỏi xác nhận trước khi push lên Github
- Không bao giờ commit file .env hoặc bất kỳ file chứa API key
