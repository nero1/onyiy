import fs from 'node:fs';
import path from 'node:path';
import { validateRuntimeEnv } from '@gifters/config';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Node.js 22 is required');
if (lock.lockfileVersion !== 3) throw new Error('npm lockfile v3 is required');
for (const group of ['dependencies', 'devDependencies']) {
  if (JSON.stringify(pkg[group]) !== JSON.stringify(lock.packages[''][group])) throw new Error(`Lockfile mismatch: ${group}`);
}
if (vercel.framework !== 'nextjs' || vercel.git?.deploymentEnabled !== false || vercel.installCommand !== 'npm ci --no-audit --no-fund') {
  throw new Error('Vercel must use Next.js, npm ci, and GitHub Actions deployment authority');
}
function paths(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (/[\[\]]/.test(entry.name)) throw new Error('Bracketed app path is not GitHub-browser-upload-safe');
    if (entry.isDirectory()) paths(path.join(dir, entry.name));
  }
}
paths('app');
if (process.argv.includes('--hosted')) {
  // Validate presence/selectors only; never print URLs, tokens or secret values.
  const env = { ...process.env, NODE_ENV: 'production' };
  const config = validateRuntimeEnv(env);
  let database: URL;
  try { database = new URL(config.databaseUrl); } catch { throw new Error('Invalid DATABASE_URL'); }
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) throw new Error('A PostgreSQL DATABASE_URL is required');
  if (config.cacheProvider === 'upstash') {
    let cache: URL;
    try { cache = new URL(env.UPSTASH_REDIS_REST_URL!); } catch { throw new Error('Invalid Upstash REST URL'); }
    if (cache.protocol !== 'https:' || cache.username || cache.password) throw new Error('Upstash requires an HTTPS REST URL without embedded credentials');
  }
  console.log('Hosted configuration preflight passed; provider connectivity still requires live verification.');
} else {
  console.log('Runtime, lockfile, Vercel configuration and upload-safe app paths passed; no hosted credentials required.');
}
