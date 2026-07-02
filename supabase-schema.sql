-- ================================================================
-- OverIQ — Supabase Database Schema
-- รัน SQL นี้ใน Supabase Dashboard → SQL Editor
-- ================================================================

-- ── Extensions ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Profiles ─────────────────────────────────────────────────
-- เชื่อมกับ auth.users อัตโนมัติ
CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     TEXT,
  tier             TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','basic','pro')),
  trial_ends_at    TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  line_linked      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile เมื่อสมัครสมาชิก
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    NOW() + INTERVAL '7 days'   -- free trial 7 วัน
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. Subscriptions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL CHECK (plan IN ('basic','pro')),
  billing_period  TEXT NOT NULL CHECK (billing_period IN ('weekly','monthly')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','trial')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ NOT NULL,
  omise_customer_id    TEXT,
  omise_charge_id      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Bookmarks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id    TEXT NOT NULL,           -- external match ID from API
  match_mode  TEXT NOT NULL CHECK (match_mode IN ('live','prematch')),
  home_team   TEXT NOT NULL,
  away_team   TEXT NOT NULL,
  league      TEXT,
  notify_threshold INT DEFAULT 75,    -- AI score ที่จะ trigger notification
  notify_on_goal   BOOLEAN DEFAULT TRUE,
  notify_on_pressure BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, match_id, match_mode)
);

ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS notify_on_pressure BOOLEAN DEFAULT TRUE;

-- ── 4. Notification Logs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id    TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('score_jump','threshold_reached','goal','pressure_spike','kickoff_reminder','line_movement')),
  message     TEXT NOT NULL,
  ai_score    INT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at     TIMESTAMPTZ
);

ALTER TABLE public.notification_logs
  DROP CONSTRAINT IF EXISTS notification_logs_type_check;
ALTER TABLE public.notification_logs
  ADD CONSTRAINT notification_logs_type_check
  CHECK (type IN ('score_jump','threshold_reached','goal','pressure_spike','kickoff_reminder','line_movement'));

-- ── 5. Match History (prediction accuracy tracking) ─────────────
CREATE TABLE IF NOT EXISTS public.match_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id   TEXT NOT NULL UNIQUE,
  home_team     TEXT NOT NULL,
  away_team     TEXT NOT NULL,
  league        TEXT,
  match_date    DATE NOT NULL,
  ai_score      INT NOT NULL,
  signal        TEXT NOT NULL CHECK (signal IN ('HOT','WATCH','WAIT')),
  final_score_home INT,
  final_score_away INT,
  result_over25 BOOLEAN,    -- true = went over 2.5
  result_btts   BOOLEAN,    -- true = both teams scored
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5b. Live Match Snapshots (realtime delta tracking) ──────────
CREATE TABLE IF NOT EXISTS public.live_match_snapshots (
  match_id          TEXT PRIMARY KEY,
  ai_score          INT NOT NULL,
  score_home        INT NOT NULL,
  score_away        INT NOT NULL,
  minute            INT NOT NULL,
  shots_on_goal     INT NOT NULL,
  dangerous_attacks INT NOT NULL,
  payload           JSONB NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5c. Live Signal Events (worker output before notification) ──
CREATE TABLE IF NOT EXISTS public.live_signal_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id    TEXT NOT NULL,
  alert_type  TEXT NOT NULL CHECK (alert_type IN ('score_jump','threshold_reached','goal','pressure_spike')),
  severity    TEXT NOT NULL CHECK (severity IN ('info','watch','hot')),
  message     TEXT NOT NULL,
  ai_score    INT NOT NULL,
  delta       INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.live_signal_events
  DROP CONSTRAINT IF EXISTS live_signal_events_alert_type_check;
ALTER TABLE public.live_signal_events
  ADD CONSTRAINT live_signal_events_alert_type_check
  CHECK (alert_type IN ('score_jump','threshold_reached','goal','pressure_spike'));

-- ── 5d. Notification Cooldowns (prevent repeated alerts) ────────
CREATE TABLE IF NOT EXISTS public.notification_cooldowns (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id     TEXT NOT NULL,
  alert_type   TEXT NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, match_id, alert_type)
);

-- ── 6. AI Prompt Config (admin can edit from back office) ────────
CREATE TABLE IF NOT EXISTS public.ai_configs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL UNIQUE,  -- e.g. 'live_insight', 'prematch_insight'
  system_prompt TEXT NOT NULL,
  max_tokens   INT NOT NULL DEFAULT 300,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default prompts
INSERT INTO public.ai_configs (name, system_prompt) VALUES
(
  'live_insight',
  'คุณเป็นนักวิเคราะห์บอลมืออาชีพที่พูดภาษาไทย วิเคราะห์บอลสดจากข้อมูลสถิติที่ให้มา ให้ insight 2-3 ประโยคที่ชัดเจน ตรงประเด็น ว่าทำไมคู่นี้น่าสนใจสำหรับ Over/BTTS หรือไม่ ห้ามพูดวนเวียน ตอบตรงๆ'
),
(
  'prematch_insight',
  'คุณเป็นนักวิเคราะห์บอลก่อนเกม วิเคราะห์จากข้อมูล H2H, ฟอร์มทีม, ราคา และ lineup ที่ให้มา สรุป 2-3 ประโยคว่าคู่นี้มีโอกาส Over 2.5 หรือ BTTS มากน้อยแค่ไหน และทำไม ภาษาไทย ตอบตรงๆ'
)
ON CONFLICT (name) DO NOTHING;

-- ── 7. Scoring Weights (admin configurable) ──────────────────────
CREATE TABLE IF NOT EXISTS public.scoring_weights (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mode           TEXT NOT NULL CHECK (mode IN ('live','prematch')),
  factor_name    TEXT NOT NULL,
  weight         INT NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mode, factor_name)
);

INSERT INTO public.scoring_weights (mode, factor_name, weight) VALUES
('live','shots_on_goal',25), ('live','xg',20), ('live','dangerous_attacks',20),
('live','odds_strength',20), ('live','match_context',15),
('prematch','odds_movement',25), ('prematch','h2h',20), ('prematch','form',20),
('prematch','injuries',15), ('prematch','team_context',10), ('prematch','historical_edge',10)
ON CONFLICT (mode, factor_name) DO NOTHING;

-- ── Row Level Security ───────────────────────────────────────────
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_match_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_signal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_configs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_weights    ENABLE ROW LEVEL SECURITY;

-- profiles: user sees/edits own only
DROP POLICY IF EXISTS "profiles_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- subscriptions: user sees own
DROP POLICY IF EXISTS "subs_own" ON public.subscriptions;
DROP POLICY IF EXISTS "subs_select_own" ON public.subscriptions;
CREATE POLICY "subs_select_own" ON public.subscriptions
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- bookmarks: user sees/edits own
DROP POLICY IF EXISTS "bookmarks_own" ON public.bookmarks;
DROP POLICY IF EXISTS "bookmarks_select_own" ON public.bookmarks;
DROP POLICY IF EXISTS "bookmarks_insert_own" ON public.bookmarks;
DROP POLICY IF EXISTS "bookmarks_update_own" ON public.bookmarks;
DROP POLICY IF EXISTS "bookmarks_delete_own" ON public.bookmarks;
CREATE POLICY "bookmarks_select_own" ON public.bookmarks
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "bookmarks_insert_own" ON public.bookmarks
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "bookmarks_update_own" ON public.bookmarks
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "bookmarks_delete_own" ON public.bookmarks
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- notification_logs: user sees own
DROP POLICY IF EXISTS "notif_own" ON public.notification_logs;
DROP POLICY IF EXISTS "notif_select_own" ON public.notification_logs;
DROP POLICY IF EXISTS "notif_update_own" ON public.notification_logs;
CREATE POLICY "notif_select_own" ON public.notification_logs
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "notif_update_own" ON public.notification_logs
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- match_history: public read
DROP POLICY IF EXISTS "match_history_read" ON public.match_history;
CREATE POLICY "match_history_read" ON public.match_history
  FOR SELECT TO anon, authenticated USING (TRUE);

-- realtime worker tables: service role writes; authenticated users can read signal feed
DROP POLICY IF EXISTS "live_snapshots_read" ON public.live_match_snapshots;
CREATE POLICY "live_snapshots_read" ON public.live_match_snapshots
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "live_signal_events_read" ON public.live_signal_events;
CREATE POLICY "live_signal_events_read" ON public.live_signal_events
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "cooldowns_own" ON public.notification_cooldowns;
CREATE POLICY "cooldowns_own" ON public.notification_cooldowns
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- ai_configs / weights: public read (admin writes via service role)
DROP POLICY IF EXISTS "ai_configs_read" ON public.ai_configs;
DROP POLICY IF EXISTS "weights_read" ON public.scoring_weights;
CREATE POLICY "ai_configs_read" ON public.ai_configs
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "weights_read" ON public.scoring_weights
  FOR SELECT TO anon, authenticated USING (TRUE);

-- Data API grants. RLS still decides which rows each role can access.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT SELECT, UPDATE ON public.notification_logs TO authenticated;
GRANT SELECT ON public.match_history TO anon, authenticated;
GRANT SELECT ON public.live_match_snapshots TO authenticated;
GRANT SELECT ON public.live_signal_events TO authenticated;
GRANT SELECT ON public.notification_cooldowns TO authenticated;
GRANT SELECT ON public.ai_configs TO anon, authenticated;
GRANT SELECT ON public.scoring_weights TO anon, authenticated;

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookmarks_user    ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_user        ON public.notification_logs(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_history_date      ON public.match_history(match_date);
CREATE INDEX IF NOT EXISTS idx_subs_user_status  ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_live_events_match_created ON public.live_signal_events(match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cooldowns_user_match ON public.notification_cooldowns(user_id, match_id);

-- ── Helper Views ─────────────────────────────────────────────────
-- user tier view (join profiles + active subscription)
CREATE OR REPLACE VIEW public.user_tier_view
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.display_name,
  p.tier,
  p.trial_ends_at,
  CASE
    WHEN p.trial_ends_at > NOW() THEN 'trial'
    WHEN s.status = 'active'     THEN p.tier
    ELSE 'free'
  END AS effective_tier,
  s.current_period_end AS subscription_end
FROM public.profiles p
LEFT JOIN public.subscriptions s
  ON s.user_id = p.id AND s.status = 'active'
  ORDER BY s.current_period_end DESC NULLS LAST;
