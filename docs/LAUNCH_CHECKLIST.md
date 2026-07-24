# LegendX launch checklist

## Product

- [ ] Final prices, stage eligibility and scholarship amounts approved
- [ ] Terms, privacy statement, refund policy and direct-marketing wording legally reviewed
- [ ] Real sessions, instructors, capacity, venue and Zoom details entered
- [ ] First admin and backup admin accounts verified

## Infrastructure

- [ ] Staging and production Supabase projects created in the chosen organisation
- [ ] Migration dry-run, push and linked DB lint passed
- [ ] PITR/backups enabled and restore owner assigned
- [ ] Vercel staging and production projects connected to Git
- [ ] Custom domain and DNS verified
- [ ] `/api/health` reports ready in production
- [ ] `pnpm readiness:staging` and `pnpm readiness:production` pass with provider-managed secrets
- [ ] `pnpm verify:deployment -- --url=<domain>` passes for both environments

## External services

- [ ] Stripe live account, webhook and end-to-end payment/refund verified
- [ ] FPS receiving details and reconciliation owner confirmed
- [ ] Resend domain verified; transactional email delivered
- [ ] WhatsApp template approved; callback and status delivery verified
- [ ] Zoom Server-to-Server OAuth meeting created
- [ ] Sentry release and alert test received
- [ ] Apple and Google Wallet passes installed on physical devices

## Quality

- [ ] Lint, typecheck, unit, build and E2E pass on the release commit
- [ ] Desktop and mobile visual review complete
- [ ] Keyboard navigation, focus order and contrast reviewed
- [ ] Member, staff and admin access boundaries tested
- [ ] Duplicate payment webhook, expired hold, refund reversal and waitlist cases tested

## Operations

- [ ] Daily opening/closing owner named
- [ ] Refund and scholarship settlement approval limits documented
- [ ] Incident contacts and provider dashboard access tested
- [ ] First-week monitoring schedule agreed
- [ ] Rollback rehearsal completed on staging
