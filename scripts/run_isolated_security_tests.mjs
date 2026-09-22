// Execute existing suites without reading repository data or production credentials.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const suites = ['test_consent_preferences.ts', 'test_device_permissions.ts', 'test_ad_consent.ts', 'test_auth_security.ts', 'test_billing_security.ts'];
let failed = false;
for (const suite of suites) {
  const isolated = mkdtempSync(path.join(tmpdir(), 'aura-security-test-'));
  const env = { ...process.env, NODE_ENV: 'test', ALLOW_LOCAL_STORAGE: 'true' };
  for (const key of Object.keys(env)) {
    if (/^(DATABASE_URL$|SQL_|PG|CLOUD_SQL_|K_SERVICE$|K_REVISION$|GOOGLE_|STRIPE_|APPLE_|FIREBASE_)/.test(key)) delete env[key];
  }
  try {
    console.log('\nRunning isolated: ' + suite);
    const result = spawnSync(process.execPath, [
      path.join(root, 'node_modules/tsx/dist/cli.mjs'), path.join(root, 'scripts', suite)
    ], { cwd: isolated, env, stdio: 'inherit', timeout: 120000 });
    if (result.status !== 0 || result.error) {
      failed = true;
      console.error(suite + ': failed or timed out');
    }
  } finally {
    if (path.dirname(isolated) !== path.resolve(tmpdir()) || !path.basename(isolated).startsWith('aura-security-test-')) {
      throw new Error('Unexpected temporary test directory');
    }
    rmSync(isolated, { recursive: true, force: true });
  }
}
process.exitCode = failed ? 1 : 0;


