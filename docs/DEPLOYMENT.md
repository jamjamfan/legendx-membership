# LegendX deployment runbook

Production target: Vercel (Next.js) + Supabase Singapore region. Use separate Supabase and Vercel projects for staging and production.

## 1. Prerequisites

- Node.js 22 and Corepack
- A Git repository connected to Vercel
- Two Supabase projects: `legendx-staging` and `legendx-production`
- Provider credentials listed in `docs/EXTERNAL_SERVICES.md`
- A verified production domain and sender domain

Never place secrets in Git. Copy `.env.example` into the provider dashboards and use a different value for every environment.

## 2. Database

Link and apply staging first:

```bash
corepack pnpm dlx supabase link --project-ref <staging-project-ref>
corepack pnpm dlx supabase db push --dry-run
corepack pnpm dlx supabase db push
```

Verify:

```bash
corepack pnpm dlx supabase db lint --linked --level warning
```

In Supabase Auth, add the staging and production URLs to Site URL / Redirect URLs. Keep email confirmation enabled. Create the first admin account normally, then promote it with an audited SQL update:

```sql
update public.profiles set role = 'admin' where email = '<admin-email>';
```

## 3. Vercel

Import the Git repository, set Framework Preset to Next.js, and configure all variables from `.env.example`. `CRON_SECRET` activates the bearer header used by the five-minute cron in `vercel.json`.

Deploy staging, then verify:

```bash
corepack pnpm readiness:staging
corepack pnpm verify:deployment -- --url=https://<staging-domain>
```

Expected result before launch: HTTP `200`, `status=ready`, `database=ready`, and every integration `ready=true`. The endpoint returns HTTP `503` for incomplete configuration or an unreachable database, so a deployment cannot be mistaken for launch-ready while Wallet or Sentry setup is still missing.

The Hobby staging project runs `/api/cron/notifications` once per day at
`02:00 UTC` (`10:00 Asia/Hong_Kong`) because Vercel Hobby limits cron jobs to
daily schedules. Trigger the same authenticated route manually during staging
tests. Restore the five-minute production schedule only after moving the
production Vercel project to a plan that supports it.

## 4. Provider callbacks

- Stripe: `https://<domain>/api/webhooks/stripe`
- WhatsApp: `https://<domain>/api/webhooks/whatsapp`
- Supabase Auth callback: `https://<domain>/auth/callback`
- Cron: `https://<domain>/api/cron/notifications`

Run one real low-value Stripe test-mode order, one FPS proof review, one email reminder, one WhatsApp template and one Zoom Stage 3 session before promoting production.

Before the production promotion, run the production environment check inside the
deployment environment and then verify the public deployment:

```bash
corepack pnpm readiness:production
corepack pnpm verify:deployment -- --url=https://<production-domain>
```

## 5. Release gate

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

Promote the exact tested commit. Do not run an unreviewed migration from a production deploy hook.

## 6. Rollback

- Application: use Vercel Instant Rollback to the last healthy deployment.
- Database: migrations are forward-only. Restore the Supabase PITR snapshot into a new project for destructive incidents; do not edit an already-applied migration.
- Payments: keep Stripe webhooks enabled during an application rollback. The handler is idempotent through `webhook_events`.
- Notifications: rotate or temporarily remove `CRON_SECRET` to pause dispatch, then inspect `notification_jobs`.
