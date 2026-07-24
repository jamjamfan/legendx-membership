# External service configuration

| Service | Purpose | Required configuration | Production verification |
| --- | --- | --- | --- |
| Supabase | Auth, PostgreSQL, RLS, Storage | URL, anon key, service role key | `/api/health` database is `ready`; Auth callback succeeds |
| Stripe | Card checkout and refunds | secret key, webhook secret | Test-mode checkout completes once; duplicate webhook is ignored |
| FPS | Manual payment | FPS identifier | Proof uploads to private bucket; staff approval completes order |
| Resend | Transactional email | API key, verified `RESEND_FROM_EMAIL` | Reminder arrives with correct date/time |
| WhatsApp Cloud API | Consented reminders | token, phone ID, verify token, app secret, approved template | Webhook verifies and delivery status is recorded |
| Zoom | Stage 3 meeting creation | Server-to-Server OAuth account/client/secret | Admin-created session stores join URL |
| Apple Wallet | Signed `.pkpass` | Pass Type ID, Team ID, PEM certificate/key, WWDR certificate | Pass installs on a physical iPhone and QR checks in |
| Google Wallet | Android class pass | Issuer ID and service-account JSON | Class is approved; Save-to-Wallet link installs pass |
| Sentry | Error and performance monitoring | DSN, org, project, auth token | Test exception appears with release/environment |
| Vercel | Hosting and scheduler | linked Git project, all environment variables | deployment healthy; cron invokes every five minutes |

## Provider-specific setup

### Stripe

Subscribe the webhook to:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`

Keep test and live secrets separate. Stripe refunds are initiated by staff only; FPS/cash refunds require an offline transfer followed by completion in Admin.

### Resend

Verify the sending domain and configure SPF/DKIM. Use a transactional address such as `LegendX <notifications@legendx.hk>`. Do not use the marketing consent flag to suppress essential order or lesson emails.

### WhatsApp

Create and approve `legendx_lesson_reminder` in `zh_HK`. The reminder has three body variables: learner name, session title and start time. Configure the callback and verify token, then subscribe to message status changes. Marketing broadcasts remain opt-in only.

### Zoom

Use a Server-to-Server OAuth app with the minimum meeting scopes. Rotate the client secret if a staff member with dashboard access leaves.

### Apple Wallet

Export the Pass Type certificate and private key as PEM, base64-encode each entire PEM file, and use the current Apple WWDR intermediate certificate. The certificate password is optional when the private key is not encrypted.

### Google Wallet

Create a dedicated service account, grant only Wallet Object issuer access, and store the compact JSON as one environment value. New issuer accounts may remain in demo mode until Google approves publishing access.

### Sentry

Create separate `staging` and `production` environments. Configure alert rules for new errors, high error rate and cron failure. `SENTRY_AUTH_TOKEN` is build-only and must not be exposed to the browser.

