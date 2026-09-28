#!/usr/bin/env node
/**
 * Creates (or promotes) the single owner ADMIN account.
 *
 *   npm run admin:promote
 *
 * The email is read from INITIAL_ADMIN_EMAIL — it is never hardcoded, and it is
 * never shipped to the client bundle. If the auth user does not exist yet it is
 * created with a randomly generated password that is printed ONCE to stdout.
 *
 * This script talks to Postgres directly, so it is a server-side operation by
 * construction. The equivalent HTTP path (for deployments without DB access) is
 * POST /api/admin/bootstrap, which requires ADMIN_BOOTSTRAP_TOKEN.
 */
import { randomBytes } from 'node:crypto';

import { banner, connectDb, fail, info, ok, warn } from './_shared.mjs';

function generatePassword() {
  const raw = randomBytes(18).toString('base64').replace(/[+/=]/g, '');
  return `Hd-${raw.slice(0, 20)}!`;
}

async function main() {
  banner('Hadiya — admin bootstrap');

  const email = (process.env.INITIAL_ADMIN_EMAIL ?? '').trim().toLowerCase();
  if (!email) {
    fail('INITIAL_ADMIN_EMAIL is not set in .env.local');
    info('Add e.g. INITIAL_ADMIN_EMAIL=owner@example.com and run again.');
    process.exit(1);
  }

  const client = await connectDb();

  try {
    const { rows: existing } = await client.query(
      'select id, email from auth.users where lower(email) = lower($1) limit 1',
      [email],
    );

    let userId;
    let createdPassword = null;

    if (existing.length > 0) {
      userId = existing[0].id;
      ok(`Found existing account ${email}`);
    } else {
      createdPassword = generatePassword();
      const { rows } = await client.query(
        `insert into auth.users
           (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
         values
           ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            $1, crypt($2, gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"مالك الموقع","signup_source":"bootstrap"}'::jsonb,
            now(), now())
         returning id`,
        [email, createdPassword],
      );
      userId = rows[0].id;

      // Email/password identities live in a separate table for this provider.
      await client.query(
        `insert into auth.identities
           (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
         values
           (gen_random_uuid(), $1, $2,
            jsonb_build_object('sub', $1::text, 'email', $1::text, 'email_verified', true),
            'email', now(), now(), now())`,
        [userId, userId],
      );

      ok(`Created account ${email}`);
    }

    // The trigger from migration 0003 normally provisions these; do it explicitly
    // so the script works even against a database seeded before the trigger.
    await client.query(
      `insert into public.profiles (id, email, full_name, signup_source)
       values ($1, $2, 'مالك الموقع', 'bootstrap')
       on conflict (id) do update set email = excluded.email`,
      [userId, email],
    );

    await client.query(
      `insert into public.user_roles (user_id, role, granted_by)
       values ($1, 'ADMIN', $1)
       on conflict (user_id) do update set role = 'ADMIN', updated_at = now()`,
      [userId],
    );

    await client.query(
      `insert into public.admin_logs (admin_user_id, action, target_type, target_id, metadata_json)
       values ($1, 'admin.bootstrap', 'user', $1, jsonb_build_object('via', 'cli'))`,
      [userId],
    );

    ok(`Role set to ADMIN for ${email}`);

    if (createdPassword) {
      banner('SAVE THIS PASSWORD NOW — it is shown only once');
      console.log(`   Email:    ${email}`);
      console.log(`   Password: ${createdPassword}\n`);
    } else {
      warn('Account already existed — its password was NOT changed.');
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  fail(error.message);
  process.exit(1);
});