import fs from 'node:fs';
import path from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const migrationDir = path.join(root, 'packages/db/src/migrations');
const schemaText = fs.readFileSync(path.join(root, 'packages/db/src/schema.ts'), 'utf8');
const schemaTables = new Set([...schemaText.matchAll(/pgTable\(['"]([^'"]+)['"]/g)].map((m) => m[1]));
const migrationTables = new Set();
for (const file of fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql'))) {
  const text = fs.readFileSync(path.join(migrationDir, file), 'utf8');
  for (const m of text.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi)) migrationTables.add(m[1]);
}
const missing = [...migrationTables].filter((name) => !schemaTables.has(name));
if (missing.length) {
  console.error(`Drizzle schema missing application tables: ${missing.join(', ')}`);
  process.exit(1);
}

const sourceRoots = ['app', 'components', 'lib', 'server', 'packages/domain', 'packages/config', 'packages/cache'];
const forbidden = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','dist'].includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      const text = fs.readFileSync(p, 'utf8');
      if (/from\s+['"]postgres['"]/.test(text)) forbidden.push(path.relative(root, p));
    }
  }
}
for (const dir of sourceRoots) walk(path.join(root, dir));
if (forbidden.length) {
  console.error(`Direct postgres client imports outside DB infrastructure: ${forbidden.join(', ')}`);
  process.exit(1);
}
console.log(`Drizzle coverage check passed (${schemaTables.size}/${migrationTables.size} migrated application tables represented).`);
