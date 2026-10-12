import fs from 'node:fs';
import path from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dir = path.join(root, 'packages/db/src/migrations');
const problems = [];
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  const tables = [...text.matchAll(/create\s+table\s+if\s+not\s+exists\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)].map((m) => m[1]);
  if (!tables.length) continue;
  const marker = text.toLowerCase().indexOf('supabase data api grants');
  if (marker < 0) { problems.push(`${file}: table-creating migration has no Supabase grant section`); continue; }
  const grants = text.slice(marker).toLowerCase();
  for (const table of tables) {
    if (!grants.includes(`public.${table.toLowerCase()}`)) problems.push(`${file}: ${table} has no explicit grant classification`);
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('Supabase migration grant classification check passed.');
