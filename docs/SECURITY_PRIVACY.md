# Security and privacy controls

## Implemented controls

- Supabase Auth with server-validated sessions
- Role-based staff/admin checks and Row Level Security
- Service-role access restricted to server code
- Stripe and Meta webhook signature verification with idempotent event logs
- HMAC-signed, expiring QR check-in tokens
- Private payment-proof storage and member-owned access policies
- CSV formula-injection protection
- Production demo-login disabled and protected portals fail closed
- Security headers, no-store responses for private exports and health output with no secrets
- Audit records for sensitive operational actions
- Sentry configured without default PII

## Data handling

Collect only data needed for account, payment, class delivery and consented communication. Full venue addresses are shown only to paid learners. Marketing email and WhatsApp consents are independent and timestamped.

Suggested retention policy, subject to legal review:

- Orders, payments, refunds and rebate ledger: 7 years
- Attendance and course completion: 7 years
- Failed webhook/notification payloads: 90 days after resolution
- Unconverted inquiries and waitlist contacts: 12 months
- Payment proof files: delete after reconciliation plus the required accounting window

Support must be able to export, correct or delete eligible member data. Financial and audit records that must be retained should be pseudonymised instead of deleted.

## Secret rotation

Rotate immediately after suspected exposure and at least annually:

- Supabase service role
- Stripe webhook secret
- Meta token, app secret and verification token
- Zoom client secret
- Cron and QR signing secrets
- Sentry auth token
- Wallet private keys/certificates before expiry

Use at least 32 random bytes for `CRON_SECRET` and `QR_SIGNING_SECRET`. Never log access tokens, private keys, service JSON or raw proof files.

