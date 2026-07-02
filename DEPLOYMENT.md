# OverIQ Production Deployment

## Current Split

- Vercel runs the Next.js app, API routes, and the scheduled `/api/jobs/live-monitor` cron.
- Supabase stores users, bookmarks, live snapshots, signal events, cooldowns, and notification logs.
- LSports Snapshot API provides normalized live and prematch reads.
- LSports RabbitMQ worker must run on a long-lived host. Do not run it as a Vercel Serverless Function.

## 1. Link Vercel Project

```bash
vercel link
```

Use the existing Vercel project if one already exists. After linking, `.vercel/project.json` should be present locally.

## 2. Add Production Environment Variables

The helper syncs supported, non-empty values from `.env.local` without printing secret values:

```bash
npm run vercel:env:sync
```

This sync is app-focused. It includes Snapshot, Supabase, cron, notification, and payment variables. It intentionally does not push worker-only RabbitMQ host settings unless you run:

```bash
npm run vercel:env:sync -- --worker
```

For production, use a strong `CRON_SECRET`. If `.env.local` contains the development placeholder, the helper generates a production-only value and does not print it.

To rotate `CRON_SECRET` and keep local worker config aligned with Vercel production:

```bash
npm run vercel:cron:rotate
```

## 3. Deploy App

```bash
npm run build
vercel --prod
```

After deploy, verify:

```bash
curl https://YOUR_VERCEL_DOMAIN/api/matches/live
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://YOUR_VERCEL_DOMAIN/api/jobs/live-monitor
```

## 4. Run RabbitMQ Worker

Deploy the worker to Railway, Fly.io, Render Worker, or a VPS.

Command:

```bash
npm run worker:lsports
```

Required worker environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LSPORTS_USERNAME=
LSPORTS_PASSWORD=
LSPORTS_INPLAY_PACKAGE_ID=4048
LSPORTS_PREMATCH_PACKAGE_ID=4049
LSPORTS_DISTRIBUTION_URL=https://stm-api.lsports.eu
LSPORTS_RMQ_INPLAY_HOST=stm-inplay.lsports.eu
LSPORTS_RMQ_PREMATCH_HOST=stm-prematch.lsports.eu
LSPORTS_RMQ_INPLAY_VHOST=StmInPlay
LSPORTS_RMQ_PREMATCH_VHOST=StmPreMatch
LSPORTS_WORKER_MODE=inplay
LSPORTS_WORKER_MONITOR_MIN_INTERVAL_MS=15000
OVERIQ_BASE_URL=https://YOUR_VERCEL_DOMAIN
CRON_SECRET=
```

Start distribution once from the deployed app:

```bash
curl -X POST https://YOUR_VERCEL_DOMAIN/api/jobs/lsports-distribution \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"command":"start","mode":"inplay"}'
```

## 5. Smoke Test

1. Sign in.
2. Open `/dashboard/live`.
3. Confirm live matches load from LSports.
4. Bookmark one match.
5. Trigger `/api/jobs/test-notification` with `CRON_SECRET`.
6. Confirm the notification bell receives a new row.
7. Confirm `/api/jobs/live-monitor` persists snapshots and signal events.

## Production Notes

- Vercel Hobby only allows daily cron jobs, so the checked-in cron is daily for deploy compatibility. On Vercel Pro, change it to `* * * * *` if you want a minute-level safety net.
- The RabbitMQ worker is the realtime trigger that prevents users from missing important minutes.
- Keep Snapshot API caching enabled to avoid provider rate limits.
- Add real Omise keys before enabling paid plans in production.
