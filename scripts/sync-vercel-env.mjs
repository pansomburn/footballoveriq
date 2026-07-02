#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const vercelDir = path.join(root, ".vercel");

const allowedKeys = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LSPORTS_SNAPSHOT_URL",
  "LSPORTS_USERNAME",
  "LSPORTS_PASSWORD",
  "LSPORTS_PACKAGE_ID",
  "LSPORTS_INPLAY_PACKAGE_ID",
  "LSPORTS_PREMATCH_PACKAGE_ID",
  "LSPORTS_FOOTBALL_SPORT_ID",
  "LSPORTS_SNAPSHOT_TIMEOUT_MS",
  "LSPORTS_DISTRIBUTION_URL",
  "LSPORTS_RMQ_INPLAY_HOST",
  "LSPORTS_RMQ_PREMATCH_HOST",
  "LSPORTS_RMQ_INPLAY_VHOST",
  "LSPORTS_RMQ_PREMATCH_VHOST",
  "LSPORTS_WORKER_MODE",
  "LSPORTS_WORKER_MONITOR_MIN_INTERVAL_MS",
  "LSPORTS_LIVE_CACHE_MS",
  "CRON_SECRET",
  "NOTIFICATION_COOLDOWN_SECONDS",
  "NEXT_PUBLIC_OMISE_PUBLIC_KEY",
  "OMISE_SECRET_KEY",
]);

const appOnlyKeys = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LSPORTS_SNAPSHOT_URL",
  "LSPORTS_USERNAME",
  "LSPORTS_PASSWORD",
  "LSPORTS_PACKAGE_ID",
  "LSPORTS_INPLAY_PACKAGE_ID",
  "LSPORTS_PREMATCH_PACKAGE_ID",
  "LSPORTS_FOOTBALL_SPORT_ID",
  "LSPORTS_SNAPSHOT_TIMEOUT_MS",
  "LSPORTS_LIVE_CACHE_MS",
  "CRON_SECRET",
  "NOTIFICATION_COOLDOWN_SECONDS",
  "NEXT_PUBLIC_OMISE_PUBLIC_KEY",
  "OMISE_SECRET_KEY",
]);

if (!existsSync(envPath)) {
  console.error("Missing .env.local. Create it before syncing Vercel env vars.");
  process.exit(1);
}

if (!existsSync(vercelDir)) {
  console.error("This repo is not linked to Vercel yet. Run `vercel link` first.");
  process.exit(1);
}

const target = process.argv.includes("--worker") ? "worker" : "app";
const keys = target === "worker" ? allowedKeys : appOnlyKeys;
const env = parseDotEnv(readFileSync(envPath, "utf8"));
if (env.CRON_SECRET === "local-dev-secret") {
  env.CRON_SECRET = randomBytes(32).toString("hex");
  console.log("Generated a production CRON_SECRET because .env.local uses the dev placeholder.");
}

const entries = Object.entries(env).filter(
  ([key, value]) => keys.has(key) && value.trim().length > 0,
);

if (entries.length === 0) {
  console.error("No supported env vars found in .env.local.");
  process.exit(1);
}

console.log(`Syncing ${entries.length} env vars to Vercel production...`);

for (const [key, value] of entries) {
  const result = spawnSync("vercel", ["env", "add", key, "production"], {
    input: value,
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf8",
  });

  if (result.status === 0) {
    console.log(`Added ${key}`);
    continue;
  }

  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (/already exists/i.test(output)) {
    console.log(`Skipped ${key} because it already exists`);
    continue;
  }

  console.error(`Failed to add ${key}`);
  if (output) {
    console.error(output);
  }
  process.exit(result.status ?? 1);
}

console.log("Vercel env sync complete.");

function parseDotEnv(input) {
  const parsed = {};

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}
