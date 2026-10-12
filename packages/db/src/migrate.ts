import fs from 'node:fs';
import path from 'node:path';
import { migrationClient } from './index';

const client = migrationClient();
const dir = path.join(process.cwd(), 'packages/db/src/migrations');
try {
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    process.stdout.write(`Applying ${file}... `);
    await client.unsafe(fs.readFileSync(path.join(dir, file), 'utf8'));
    console.log('ok');
  }
} finally {
  await client.end({ timeout: 3 });
}
