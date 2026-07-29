# Betolla Cosmetics

A full e-commerce platform for a cosmetics brand: a customer storefront plus Admin, Staff, and Delivery dashboards, sharing one sign-in screen with role-based routing. Bilingual (English/Arabic, full RTL), light/dark theming, loyalty & wallet, and a full analytics suite.

Full architecture, schema, and phased build plan: see the plan doc referenced in this repo's setup notes.

## Prerequisites

Just Node.js (20+). No Docker, no separately-installed PostgreSQL, no admin rights required - `npm run dev` provisions a real local Postgres binary for you (via `embedded-postgres`, into a project-local `.pgdata/` directory) the first time it runs.

## Getting started

```bash
npm install
cp .env.example .env   # then edit JWT_SECRET / ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev
```

`npm run dev` runs the local database and the Next.js dev server together (via `concurrently`) in one terminal; `Ctrl+C` stops both. Open [http://localhost:3000](http://localhost:3000).

The very first time, run the one-time schema/seed setup in a second terminal while `npm run dev` (or `npm run db:start`) is up:

```bash
npm run db:migrate
npm run db:seed
```

## Database scripts

| Command | What it does |
|---|---|
| `npm run db:start` | Starts (or reuses) the local Postgres server in the foreground. Use this in a second terminal when you need the database up on its own (e.g. to run the commands below). |
| `npm run db:migrate` | Applies Prisma migrations. Needs the database up. |
| `npm run db:seed` | Populates the database with demo data (products, orders, customers, etc.). Needs the database up. |
| `npm run db:reset` | Drops, re-migrates, and reseeds - useful when the schema changes. Needs the database up. |
| `npm run db:studio` | Opens Prisma Studio to browse the data. Needs the database up. |

## Demo accounts

The seed script creates one of each role, plus 20 demo customers, ~190 orders, reviews, tickets, and more, so the app is populated immediately. Every account (except Admin) shares one password.

| Role | Email | Password |
|---|---|---|
| Admin | value of `ADMIN_EMAIL` in your `.env` | value of `ADMIN_PASSWORD` in your `.env` |
| Staff | lina.haddad@betolla.com (+ 2 more) | `Betolla123!` |
| Delivery | khaled.fares@betolla.com (+ 3 more) | `Betolla123!` |
| Customer | sara.khoury@example.com (+ 19 more) | `Betolla123!` |

## Tech stack

Next.js (App Router) + TypeScript + Tailwind CSS, PostgreSQL + Prisma, custom JWT auth with DB-backed sessions, React Query + Zustand, Recharts, Leaflet, next-intl.

## Banner media in production

Homepage banner images/videos are stored under `public/uploads/banners` by the current local/VPS storage adapter. Back up this directory with the database and serve it through the same persistent VPS volume. If the app later runs on ephemeral or multi-instance hosting, replace the storage adapter in `src/lib/server/storage.ts` with S3-compatible object storage/CDN; the Admin UI and stored media URLs can remain unchanged. Images are capped at 8MB and videos at 25MB; MP4/WebM videos should normally be 6–15 seconds.

## Production safety checklist

- Use a managed or backed-up PostgreSQL database and run `npm exec prisma migrate deploy` during release. The embedded project-local database is for development, not a resilient production database.
- Set a unique high-entropy `JWT_SECRET`, HTTPS `NEXT_PUBLIC_APP_URL`, and strong Admin credentials through the deployment secret manager.
- Checkout is Cash on Delivery only. Card data is never requested, stored, or processed.
- Set `TRUST_PROXY=true` only behind a proxy you control that overwrites forwarded-IP headers. Authentication rate limits are stored in PostgreSQL and shared across app instances.
- Persist and back up `public/uploads` and `uploads-private`, or replace the storage adapter with private object storage plus signed URLs before using ephemeral/multi-instance hosting.
- Terminate TLS at the proxy/platform. Production responses include CSP, HSTS, frame, MIME-sniffing, referrer, and permissions-policy headers.
- Schedule database backups and an orphan-upload cleanup job, monitor 5xx/payment/refund/stock events, and test a restore before launch.

## Environment variables

See `.env.example`. `DATABASE_URL` points at the local Postgres server by default - only change it if you point at a different Postgres instance. `ADMIN_EMAIL`/`ADMIN_PASSWORD` set the one seeded Admin account (Admin accounts are never created through the UI).
