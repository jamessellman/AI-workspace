# AI Workspace

A single-user **personal operating system** — manage tasks, notes, timesheets, and
documents through a clean UI, and (Phase 2) through a natural-language chat that
orchestrates the same actions.

Built with **Next.js (App Router) · TypeScript (strict) · Supabase (Auth + Postgres +
Storage) · Tailwind + shadcn/ui · Vercel AI SDK**.

---

## Architecture at a glance

- **Server Actions are the single source of truth.** Every mutation/read lives in
  `lib/actions/*`. The Phase 1 UI calls them directly; the Phase 2 AI tools call the
  exact same functions — the model never writes free-form SQL.
- **Row Level Security everywhere.** Every table is scoped to `auth.uid()`. The service
  role key is server-only and never shipped to the client.
- **Auth via `@supabase/ssr`.** Session lives in cookies, refreshed in `proxy.ts`
  (Next 16's middleware convention) which also gates unauthenticated access.

```
app/
  (auth)/login/         Login screen
  (app)/                Protected shell (sidebar + header)
    board/  notes/  timesheets/  documents/  chat/
  auth/callback/        OAuth / magic-link code exchange
components/             ui/ (shadcn) + feature components
lib/
  supabase/             client / server / admin / session helpers
  actions/              tasks, notes, timesheets, documents, auth  (source of truth)
  validation/           zod schemas (shared by forms + AI tools)
  ai/                   provider abstraction + tools (Phase 2)
types/database.ts       hand-written DB types
supabase/schema.sql     schema + RLS + storage setup
proxy.ts                session refresh + route protection
```

---

## Prerequisites

- Node.js 20+
- A Supabase project (already provisioned)
- An OpenAI API key (only needed for the Phase 2 chat)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same | Public anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | same | **Server-only.** Privileged maintenance |
| `OPENAI_API_KEY` | platform.openai.com | Phase 2 chat (function calling) |
| `OPENAI_MODEL` | optional | Defaults to `gpt-4o-mini` |

### 3. Apply the database schema

Open **Supabase → SQL Editor → New query**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
`tasks`, `notes`, `timesheets`, and `documents` tables, all RLS policies (scoped to
`auth.uid()`), full-text search on notes, and the private `documents` storage bucket
with its access policies.

### 4. Create your user

This is a single-user app — there's no signup flow. Create your account in
**Supabase → Authentication → Users → Add user** (set email + password, mark as
confirmed). Use those credentials on the login screen.

### 5. Run locally

```bash
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login`; sign in to reach the
board.

---

## Verifying Phase 1 (no AI)

You should be able to, entirely through the UI:

- **Auth** — sign in; unauthenticated visits to any page redirect to `/login`.
- **Board** — create tasks, drag them between Backlog → To Do → In Progress → Complete
  (order persists), edit, move, and delete.
- **Notes** — capture notes, search them (Postgres full-text over title + body).
- **Timesheets** — log hours against a project, filter by project/date range, see totals.
- **Documents** — upload to Storage, download via signed URL, edit category/summary,
  link to a task, and delete.

---

## Phase 2 — AI chat (orchestration layer)

The `/chat` page lets you drive everything in natural language. The AI is an
orchestration layer: it interprets requests and calls a typed set of tools
(`lib/ai/tools.ts`) that are backed by the same server actions above.

Example commands:

- "Create a task to update the homepage on Friday."
- "Log 3 hours working on authentication."
- "Summarise and store these meeting notes: …"
- "Show my outstanding tasks."
- "Find documents related to tax."

**Swapping providers:** all model calls go through `lib/ai/provider.ts`. The default is
OpenAI; point it at `@ai-sdk/anthropic` (or another provider) without touching feature
code.

---

## Scripts

```bash
npm run dev      # local dev server
npm run build    # production build
npm run start    # run the production build
npm run lint     # eslint
```

---

## Deploying to Vercel

1. Push this repo to GitHub (already wired to `origin`).
2. Import the project in Vercel.
3. Add the same environment variables from `.env.local` in
   **Vercel → Project → Settings → Environment Variables**.
4. Deploy. The schema/RLS SQL only needs to be run once against your Supabase project
   (step 3 above) — it is not part of the Vercel build.
