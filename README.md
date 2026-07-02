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

- **Overview**: paid-to-date and pending per person, computed live from the transaction log.
- **Registrar Aporte**: any sibling picks their name, enters an amount/date/note, and submits — visible to everyone immediately.
- **Panel Admin**: full transaction history with delete (for correcting mistakes), plus the same per-person paid/pending breakdown for oversight.
- The monthly obligation (€50 base + €30/month since December 2025) is calculated automatically each time the page loads — no more manual monthly script or cron job.

## Local development

```
npm install
npx netlify dev
```

## Deployment

Hosted on Netlify, connected to this repo for continuous deployment on push to `main`.
