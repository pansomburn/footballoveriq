# OverIQ — Setup Guide

## Routes ทั้งหมด
| URL | หน้า |
|-----|------|
| `/auth/login` | Login / Register |
| `/dashboard/live` | Live In-play Dashboard |
| `/dashboard/prematch` | Pre-match Analysis |
| `/pricing` | Pricing & Payment |
| `/admin` | Back Office |
| `/api/matches/live` | API: live matches |
| `/api/matches/prematch?date=YYYY-MM-DD` | API: pre-match |
| `/api/bookmarks?mode=live` | API: user bookmarks |
| `/api/notifications` | API: notification feed |
| `/api/payment/charge` | API: Omise payment |
| `/api/auth/callback` | OAuth callback |
| `/api/jobs/live-monitor` | Cron/worker: realtime score monitor |
| `/api/jobs/lsports-distribution` | Cron/worker: LSports Distribution control |
| `/api/jobs/test-notification` | QA-only: trigger notification for latest live bookmark |

## Environment Variables

Create `.env.local` from `.env.example`.

Required for app/auth:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Required for LSports live data:

```bash
LSPORTS_SNAPSHOT_URL=https://stm-snapshot.lsports.eu
LSPORTS_USERNAME=
LSPORTS_PASSWORD=
LSPORTS_INPLAY_PACKAGE_ID=
LSPORTS_PREMATCH_PACKAGE_ID=
LSPORTS_FOOTBALL_SPORT_ID=6046
```

Required for LSports RabbitMQ realtime feed:

```bash
LSPORTS_DISTRIBUTION_URL=https://stm-api.lsports.eu
LSPORTS_RMQ_INPLAY_HOST=stm-inplay.lsports.eu
LSPORTS_RMQ_PREMATCH_HOST=stm-prematch.lsports.eu
LSPORTS_RMQ_INPLAY_VHOST=StmInPlay
LSPORTS_RMQ_PREMATCH_VHOST=StmPreMatch
LSPORTS_WORKER_MODE=inplay
LSPORTS_WORKER_MONITOR_MIN_INTERVAL_MS=15000
OVERIQ_BASE_URL=http://localhost:3000
```

Required for realtime persistence and notifications:

```bash
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
NOTIFICATION_COOLDOWN_SECONDS=300
```

Required for payment:

```bash
NEXT_PUBLIC_OMISE_PUBLIC_KEY=
OMISE_SECRET_KEY=
```

## Database Setup

Run `supabase-schema.sql` in Supabase SQL Editor.

The realtime monitor uses these tables:

- `bookmarks`: user match watchlist and notification rules
- `live_match_snapshots`: latest match state for delta calculation
- `live_signal_events`: generated realtime events
- `notification_cooldowns`: prevents repeated alerts
- `notification_logs`: per-user notification feed

## Realtime Monitor

The monitor endpoint is:

```bash
GET /api/jobs/live-monitor
POST /api/jobs/live-monitor
```

It performs:

1. Load live matches from LSports or mock fallback.
2. Calculate current AI Score.
3. Compare with previous snapshots.
4. Persist snapshots and signal events when Supabase admin env is configured.
5. Create `notification_logs` for bookmarked matches that pass user rules and cooldown.

Dashboard bookmark buttons call `/api/bookmarks`; those rows are what the monitor uses to decide who should receive each alert.

The Topbar notification bell reads `/api/notifications`, displays unread alerts from `notification_logs`, and marks rows as read via `PATCH /api/notifications`.

QA notification test after bookmarking at least one live match:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type":"threshold_reached","aiScore":88}' \
  http://localhost:3000/api/jobs/test-notification
```

Manual test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/jobs/live-monitor
```

On Vercel Hobby, `vercel.json` runs this endpoint once per day because Hobby cron cannot run every minute. Realtime alerts should come from the RabbitMQ worker, which calls this endpoint whenever LSports sends provider events. On Vercel Pro, you can change the cron schedule back to `* * * * *` as an extra safety net. Manual workers may use `Authorization: Bearer ...` or `x-cron-secret`.

## LSports RabbitMQ Worker

LSports production integration is a RabbitMQ feed. Snapshot API is still used by this app as the normalized read model and resync source; the RabbitMQ worker wakes the score monitor when provider events arrive.

Start In-Play Distribution:

```bash
curl -X POST http://localhost:3000/api/jobs/lsports-distribution \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"command":"start","mode":"inplay"}'
```

Start Pre-Match Distribution:

```bash
curl -X POST http://localhost:3000/api/jobs/lsports-distribution \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"command":"start","mode":"prematch"}'
```

Run the worker:

```bash
npm run worker:lsports
```

The worker connects to queue `_${LSPORTS_PACKAGE_ID}_` on `stm-inplay.lsports.eu` by default, consumes messages, and calls `/api/jobs/live-monitor` with throttling. Keep this worker on a long-running host such as Railway, Fly.io, Render worker, or a VPS. Vercel Serverless functions should only run the Next.js app, API routes, and cron endpoint.

## Provider Behavior

If LSports env vars are missing, `/api/matches/live`, `/api/matches/prematch`, and `/api/jobs/live-monitor` return mock data. This keeps local development usable before provider credentials are available.
