import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

// Measure the scripts actually referenced by the prerendered homepage,
// including shared runtime and legacy polyfills; missing output is a failure.
const html = fs.readFileSync('.next/server/app/index.html', 'utf8');
const files = new Set([...html.matchAll(/src="\/_next\/([^"?]+\.js)"/g)].map((match) => match[1]));
if (!files.size) throw new Error('No homepage JavaScript found in the current build');
let bytes = 0;
for (const file of files) {
  const resolved = path.resolve('.next', file);
  if (!resolved.startsWith(path.resolve('.next/static') + path.sep)) throw new Error('Unexpected script path');
  bytes += gzipSync(fs.readFileSync(resolved)).length;
}
const limit = 200 * 1024;
console.log(`Homepage JavaScript: ${(bytes / 1024).toFixed(2)} KiB gzip (${files.size} scripts; limit 200 KiB).`);
console.log('Vercel function packaging, provider latency, mobile LCP and quota measurements require hosted acceptance.');
if (bytes > limit) throw new Error('Initial route JavaScript exceeds PRD budget');
