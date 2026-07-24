# LegendX operations handbook

## Daily opening checks

1. Open `/api/health`; required integrations must be ready.
2. Review pending FPS proofs, refund requests and failed `notification_jobs`.
3. Check today’s lessons, capacity, waitlist invitations and Zoom links.
4. Review Sentry for new production errors and Stripe for failed webhooks.

## Orders and refunds

- Stripe orders are paid only by a verified webhook.
- FPS/cash orders require staff review; never mark an order paid from a screenshot alone without matching amount and sender reference.
- Refund requests move through requested → approved → completed/rejected.
- A completed refund voids or reverses the related scholarship record through the database rule.
- Never edit payment or rebate rows directly. Use Admin actions so `audit_logs` remains complete.

## Sessions and attendance

- Publish only after venue, instructor, capacity and start/end time are confirmed.
- Cancelling a session queues notifications for confirmed learners and releases reserved enrollments.
- Invite the waitlist in creation order. Invitations expire after 24 hours.
- QR check-in validates the signed token, member, session, lesson and enrollment, and cannot create duplicate attendance.
- Export attendance after every session and reconcile exceptions before marking completion.

## Notifications

The scheduler expires stale holds, creates T−1 day/T−3 hour reminders, claims jobs with a database lock, and records provider IDs. Failed jobs retry with bounded attempts.

To pause dispatch during an incident, remove/rotate `CRON_SECRET` in Vercel. Do not delete queued jobs. After recovery, restore the secret and trigger the cron once manually with the bearer token.

## Scholarship settlement

- Confirm the referred order is still paid.
- Match the slot, amount and batch expiry.
- Settle through Admin only after transfer is completed.
- Export the rebate CSV for finance reconciliation.
- Refunds after settlement create a reversal obligation; finance must resolve it explicitly.

## Backup and restore

- Enable Supabase Point-in-Time Recovery for production.
- Keep daily logical backups in an encrypted account separate from Supabase.
- Run a quarterly restore drill into a temporary project and record time-to-restore.
- Storage payment proofs are private; include the bucket in retention and deletion procedures.

## Incident levels

- P0: data exposure, incorrect payment capture or widespread account access failure. Disable affected integration, rotate credentials, preserve logs and notify the owner immediately.
- P1: checkout, authentication or reminder outage. Roll back app, pause cron if needed, and reconcile missed events.
- P2: individual order, content or display issue. Record, fix and audit without bypassing workflow.

After every P0/P1, document timeline, impact, root cause, remediation and follow-up owner.

