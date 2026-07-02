#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const vercelDir = path.join(root, ".vercel");

if (!existsSync(envPath)) {
  console.error("Missing .env.local. Create it before rotating CRON_SECRET.");
  process.exit(1);
}

if (!existsSync(vercelDir)) {
  console.error("This repo is not linked to Vercel yet. Run `vercel link` first.");
  process.exit(1);
}

const nextSecret = randomBytes(32).toString("hex");
const envText = readFileSync(envPath, "utf8");
const nextEnvText = upsertDotEnvValue(envText, "CRON_SECRET", nextSecret);
writeFileSync(envPath, nextEnvText);

const removeResult = spawnSync(
  "vercel",
  ["env", "rm", "CRON_SECRET", "production", "--yes"],
  { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
);

const removeOutput = `${removeResult.stdout}\n${removeResult.stderr}`.trim();
if (removeResult.status !== 0 && !/not found|does not exist/i.test(removeOutput)) {
  console.error("Failed to remove existing CRON_SECRET from Vercel.");
  if (removeOutput) {
    console.error(removeOutput);
  }
  process.exit(removeResult.status ?? 1);
}

const addResult = spawnSync("vercel", ["env", "add", "CRON_SECRET", "production"], {
  input: nextSecret,
  stdio: ["pipe", "pipe", "pipe"],
  encoding: "utf8",
});

if (addResult.status !== 0) {
  console.error("Failed to add rotated CRON_SECRET to Vercel.");
  const addOutput = `${addResult.stdout}\n${addResult.stderr}`.trim();
  if (addOutput) {
    console.error(addOutput);
  }
  process.exit(addResult.status ?? 1);
}

console.log("Rotated CRON_SECRET in .env.local and Vercel production.");

function upsertDotEnvValue(input, key, value) {
  const lines = input.split(/\r?\n/);
  let replaced = false;
  const nextLines = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      replaced = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!replaced) {
    if (nextLines.at(-1) !== "") {
      nextLines.push("");
    }
    nextLines.push(`${key}=${value}`);
  }

  return nextLines.join("\n");
}
