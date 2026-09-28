/**
 * Shared helpers for the Node-side scripts (migrations, seeding, bootstrap).
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from 'pg';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function banner(title) {
  const line = '─'.repeat(Math.max(8, 60 - title.length));
  console.log(`\n\x1b[38;5;43m◆\x1b[0m \x1b[1m${title}\x1b[0m ${line}\n`);
}

export function ok(message) {
  console.log(`  \x1b[38;5;43m✔\x1b[0m ${message}`);
}

export function warn(message) {
  console.log(`  \x1b[38;5;221m▲\x1b[0m ${message}`);
}

export function fail(message) {
  console.log(`  \x1b[38;5;204m✖\x1b[0m ${message}`);
}

export function info(message) {
  console.log(`  \x1b[38;5;245m·\x1b[0m ${message}`);
}

function parseEnv(raw) {
  for (const line of raw.split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const match = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    const value = rawValue.replace(/^["']|["']$/g, '').trim();
    if (value) process.env[key] = value;
  }
}

/** Loads .env.local then .env without overriding already-set variables. */
export async function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      parseEnv(await readFile(join(ROOT, file), 'utf8'));
    } catch {
      /* file is optional */
    }
  }
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`\n✖ ${name} is not set. Add it to .env.local first.\n`);
    process.exit(1);
  }
  return value;
}

export function makeClient(connectionString) {
  return new Client({
    connectionString,
    ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
  });
}

export async function connectDb() {
  await loadEnv();
  const connectionString = requireEnv('DATABASE_URL');
  const client = makeClient(connectionString);
  await client.connect();
  return client;
}

/** Cheap, dependency-free Arabic-aware slug. */
export function slugify(input) {
  const base = (input ?? '')
    .toString()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // strip Arabic diacritics
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(0, 48);

  const cleaned = base.replace(/^-|-$/g, '');
  return cleaned || 'hadiya';
}

export function randomSlugSuffix(length = 6) {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function daysAgo(days, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return d;
}