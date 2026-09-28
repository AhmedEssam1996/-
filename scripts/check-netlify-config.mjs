/**
 * Validates netlify.toml with a real TOML parser.
 *
 * The previous deploy failed with "trying to redefine an already defined table
 * or value" during the config-parsing stage, before npm install. Nothing else
 * runs, so a TOML syntax error has to be caught locally — a build log from
 * Netlify is a slow and expensive way to learn a file has a stray bracket.
 */
import { readFileSync } from 'node:fs';
import { parse as parseToml } from 'smol-toml';

// The config sits at the repo root, one level up from scripts/.
const path = new URL('../netlify.toml', import.meta.url);
const source = readFileSync(path, 'utf8');

try {
  const config = parseToml(source);
  console.log('TOML parses OK.\n');
  console.log(JSON.stringify(config, null, 2));

  // Assert the values the deploy actually depends on.
  const checks = [
    ['build.environment.NODE_VERSION', config.build?.environment?.NODE_VERSION === '20'],
    ['build.environment.NEXT_TELEMETRY_DISABLED', config.build?.environment?.NEXT_TELEMETRY_DISABLED === '1'],
    // `[plugins]` is a plain table keyed by the plugin name, not a list — so
    // config.plugins is an object and the package is the single value in it.
    // Asserting plugins[0] is what made this check fail for a correct file.
    ['plugins declares @netlify/plugin-nextjs', config.plugins?.package === '@netlify/plugin-nextjs'],
    ['functions.node_bundler', config.functions?.node_bundler === 'esbuild'],
    ['functions./api/** timeout', config.functions?.['/api/**']?.timeout === 30],
    ['header blocks present', Array.isArray(config.headers) && config.headers.length >= 2],
  ];

  console.log('');
  let bad = 0;
  for (const [label, ok] of checks) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) bad += 1;
  }
  process.exit(bad === 0 ? 0 : 1);
} catch (err) {
  console.error('TOML PARSE FAILED:', err.message);
  process.exit(1);
}
