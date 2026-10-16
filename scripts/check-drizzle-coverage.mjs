import crypto from 'node:crypto';
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

// This reviewed baseline was established by creating the exported Drizzle DDL
// in a fresh database and comparing owner catalogs. A changed model or forward
// migration requires another catalog comparison, not a table-count-only pass.
const baselines=fs.readdirSync(path.join(root,'packages/db')).filter(name=>/^schema-contract_v\d+\.json$/.test(name));
if(baselines.length!==1)throw new Error('Exactly one current verified schema contract is required');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'packages/db',baselines[0]),'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('base64');
for(const [file,expected] of Object.entries(baseline.source_sha256_base64)){
 if(hash(path.join(root,file))!==expected)throw new Error('Drizzle declarations changed: re-verify the owner/model catalog and update the versioned schema contract');
}
const currentMigrations=Object.fromEntries(fs.readdirSync(migrationDir).filter(name=>name.endsWith('.sql')).sort().map(name=>[name,hash(path.join(migrationDir,name))]));
if(JSON.stringify(currentMigrations)!==JSON.stringify(baseline.migrations_sha256_base64))throw new Error('Migration contract changed: re-verify schema congruence without rewriting applied checksums');
if(schemaTables.size!==baseline.verified_tables)throw new Error('Verified schema table count changed');
console.log(`Verified declaration/migration contract preserved (${baseline.verified_columns} columns, ${baseline.verified_check_constraints} checks, ${baseline.verified_standalone_indexes} indexes; SQL-only timing/triggers inventoried).`);
