# Fondo Familiar

Interactive family fund tracker for Mohammed, Abdullah, Asia, and Fausia (€30/month each).

Replaces the old flow where Abdullah manually pasted payment updates into a terminal —
now each sibling logs their own deposits directly in the app, and Abdullah gets an
admin view to audit the full history.

## Structure

- `public/index.html` — the app (password gate → Overview / Add Deposit / Admin tabs)
- `netlify/functions/transactions.js` — serverless API backed by Netlify Blobs (shared storage, no external database)
- `netlify.toml` — routes `/api/*` to the function, publishes `public/` as the site

## How it works

- **Overview**: paid-to-date and pending per person, plus the fund's actual available balance, computed live from the transaction log.
- **Registrar Aporte**: any sibling picks their name, enters an amount/date/note, and submits — visible to everyone immediately.
- **Registrar Retiro**: any sibling can log money spent out of the pooled fund (e.g. a family purchase) — withdrawals reduce the available balance and the fund chart, but don't count against any individual's personal dues, and can't exceed what's actually in the fund.
- **Panel Admin**: full transaction history — deposits and withdrawals — with delete (for correcting mistakes), plus the per-person paid/pending breakdown for oversight.
- **🔔 Notificaciones**: each sibling can opt in to push notifications on their own device (`public/sw.js` + `netlify/functions/subscribe.js`, subscriptions stored in a separate Netlify Blobs store). Currently a manual "enable + send me a test" flow — a scheduled monthly reminder for whoever's still pending is the next step, not yet wired up. Requires the app to be added to the Home Screen on iOS (Safari's Web Push restriction).
- The monthly obligation (€50 base + €30/month since December 2025) is calculated automatically each time the page loads — no more manual monthly script or cron job.

## Local development

```
npm install
npx netlify dev
```

`web-push` needs `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` set as Netlify env vars to send notifications (already configured on the linked site; the matching public key is hardcoded in `subscribe.js` and `index.html` since it isn't secret).

## Deployment

Hosted on Netlify, connected to this repo for continuous deployment on push to `main`.
