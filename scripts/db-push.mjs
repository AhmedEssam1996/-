#!/usr/bin/env node
/**
 * Applies every SQL file in supabase/migrations in filename order.
 *
 * Requires DATABASE_URL (the direct Postgres connection string, not the
 * Supabase REST URL). Each migration runs inside its own transaction, and
 * applied files are recorded in `public._hadiya_migrations` so re-running is
 * idempotent.
 *
 *   npm run db:push
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'supabase', 'migrations');

function loadEnvFile(path) {
  return readFile(path, 'utf8')
    .then((raw) => {
      for (const line of raw.split(/\r?\n/)) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (!match) continue;
        const [, key, rawValue] = match;
        if (process.env[key] !== undefined) continue;
        const value = rawValue.replace(/^["']|["']$/g, '').trim();
        if (value) process.env[key] = value;
      }
    })
    .catch(() => { });
}

async function main() {
  await loadEnvFile(join(here, '..', '.env.local'));
  await loadEnvFile(join(here, '..', '.env'));

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      '\n✖ DATABASE_URL is not set.\n' +
      '  Add it to .env.local (Supabase → Project Settings → Database → Connection string → URI).\n',
    );
    process.exit(1);
  }

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    console.log('No migrations found.');
    return;
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  await client.query(`
    create table if not exists public._hadiya_migrations (
      filename    text primary key,
      applied_at  timestamptz not null default now()
    );
  `);

  const { rows } = await client.query('select filename from public._hadiya_migrations');
  const applied = new Set(rows.map((r) => r.filename));

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`• ${file} — already applied`);
      continue;
    }

    const sql = await readFile(join(migrationsDir, file), 'utf8');
    process.stdout.write(`▶ ${file} … `);
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into public._hadiya_migrations (filename) values ($1)', [file]);
      await client.query('commit');
      console.log('done');
      ran += 1;
    } catch (error) {
      await client.query('rollback');
      console.log('FAILED');
      console.error(`\n✖ ${file}\n${error.message}\n`);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log(`\n✔ Migrations complete — ${ran} applied, ${files.length - ran} already present.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});