import fs from 'node:fs';
import path from 'node:path';
import { migrationClient } from './index';

const client = migrationClient();
const dir = path.join(process.cwd(), 'packages/db/src/migrations');
try {
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    process.stdout.write(`Applying ${file}... `);
    const statement = fs.readFileSync(path.join(dir, file), 'utf8');
    await client.begin(async (transaction) => { await transaction.unsafe(statement); });
    console.log('ok');
  }
} finally {
  await client.end({ timeout: 3 });
}
