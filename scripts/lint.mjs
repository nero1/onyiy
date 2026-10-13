import fs from 'node:fs';
import path from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist'].includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(p);
  }
}
for (const dir of ['packages', 'app', 'components', 'lib', 'server', 'workers']) walk(path.join(root, dir));
const errors = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if ((file.includes('/server/')||file.includes('/components/')||file.includes('/app/')||file.includes('/lib/'))&&/from ['"][^'"]*workers\/signer/.test(text)) errors.push(`${file}: web imports isolated signer`);
  if (file.includes('/packages/domain/') && /(from ['"](postgres|next|react|ioredis|@vercel))/.test(text)) errors.push(`${file}: domain imports vendor SDK`);
  if ((file.includes('/components/') || file.includes('/lib/')) && /(SIGNED_PAYLOAD|PRIVATE_KEY|MFA_ENCRYPTION_KEY|PLATFORM_DEV_ADDRESS)/.test(text)) errors.push(`${file}: client-capable code references server secret name`);
  if (/parseFloat\(|Number\([^\n]*(amount|balance|fee)/i.test(text) && !file.endsWith('dashboard-app.tsx')) errors.push(`${file}: review floating money conversion`);
  if (file.includes('/components/') && /from ['"]postgres['"]/.test(text)) errors.push(`${file}: client imports postgres driver`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`custom lint/import-boundary checks passed (${files.length} files).`);
