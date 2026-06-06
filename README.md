# herald

Webhook-to-Telegram bridge on Cloudflare Workers. Create per-event webhook URLs (random UUID, optional name, optional expiry, target recipients). A `POST` to one relays the body as a Telegram message to the targeted recipients.

Backed by D1. Admin panel is protected by Cloudflare Access.

## Setup

```bash
pnpm install
pnpm exec wrangler login
pnpm exec wrangler d1 create herald   # paste returned database_id into wrangler.jsonc
pnpm exec wrangler d1 migrations apply herald --local
pnpm exec wrangler d1 migrations apply herald --remote
pnpm exec wrangler secret put TG_TOKEN              # BotFather token
pnpm exec wrangler secret put TG_WEBHOOK_SECRET     # random string, e.g. `openssl rand -hex 24`
pnpm exec wrangler deploy
```

Then, in the Cloudflare dashboard, Zero Trust > Access > Applications: add a self-hosted app for `https://<worker>.workers.dev/admin*` with a policy that allows your identity. Without this, the admin panel is unprotected.

Point Telegram at the Worker:

```bash
curl -X POST "https://api.telegram.org/bot$TG_TOKEN/setWebhook" \
  -d "url=https://<worker>.workers.dev/tg/webhook/$TG_WEBHOOK_SECRET" \
  -d "secret_token=$TG_WEBHOOK_SECRET"
```

Register targets by messaging the bot:

- Private chat: DM the bot `/start <alias>` (e.g. `/start me`).
- Group or supergroup: add the bot to the group, then send `/register <alias>` (use `/register@<botname> <alias>` if multiple bots are present). For a forum group, send it inside the topic you want to target.
- Channel: add the bot as an admin, then post `/register <alias>` in the channel.

Each alias maps to one (chat, optional topic) pair. Re-registering with the same alias overwrites it.

## Usage

Open `https://<worker>.workers.dev/admin` to create and manage hooks.

To trigger a hook from a script:

```bash
curl -X POST https://<worker>.workers.dev/h/<uuid> \
  -H "content-type: application/json" \
  -d '{"text":"hello *world*","parse_mode":"Markdown"}'
```

`410 Gone` once expired, `404` if the UUID is unknown.

## CI

`.github/workflows/deploy.yml` deploys on push to `main`. Required repo secrets: `CLOUDFLARE_API_TOKEN` (with `Workers Scripts:Edit` and `D1:Edit`) and `CLOUDFLARE_ACCOUNT_ID`.
