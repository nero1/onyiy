import fs from 'node:fs'; import path from 'node:path';
const root=new URL('..',import.meta.url).pathname; const hits=[];
const patterns=[[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,'private key'],[/\bAKIA[0-9A-Z]{16}\b/,'AWS access key'],[/\b(?:sk_live_|sk-proj-)[A-Za-z0-9_-]{20,}\b/,'API secret'],[/\b[0-9a-f]{64}\b/i,'64-hex secret-like value']];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','dist','.next','.vercel'].includes(e.name)||e.name.endsWith('.tsbuildinfo'))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(!/\.(png|jpg|jpeg|gif|zip)$/.test(e.name)){const t=fs.readFileSync(p,'utf8');for(const [re,label] of patterns)if(re.test(t))hits.push(`${path.relative(root,p)}: ${label}`)}}}
// Scan browser bundles for credential formats too. Generic 64-hex strings are
// build/content hashes here, so apply that heuristic only to repository inputs.
function scanClient(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())scanClient(p);else if(/\.(js|map)$/.test(e.name)){const t=fs.readFileSync(p,'utf8');for(const [re,label] of patterns.slice(0,3))if(re.test(t))hits.push(`${path.relative(root,p)}: ${label}`)}}}
scanClient(path.join(root,'.next/static'));
walk(root); if(hits.length){console.error(hits.join('\n'));process.exit(1)} console.log('secret scan passed.');
