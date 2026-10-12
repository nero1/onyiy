import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import {spawn} from 'node:child_process';
import net from 'node:net';

// A nonce-protected homepage is rendered per request. Measure the actual
// current production response with no provider credentials or private API calls.
async function homepage(){
 const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});const port=server.address().port;await new Promise(resolve=>server.close(resolve));
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:'ignore',detached:true});let exited=false;child.on('exit',()=>{exited=true});
 try{const deadline=Date.now()+20000;while(Date.now()<deadline){if(exited)throw new Error('Production measurement server exited');try{const r=await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(1500),redirect:'error'});if(r.ok){const html=await r.text();if(html.length>2097152)throw new Error('Homepage response exceeds measurement bound');return html}}catch{}await new Promise(resolve=>setTimeout(resolve,100))}throw new Error('Production homepage measurement timed out');}
 finally{if(child.pid)try{process.kill(-child.pid,'SIGTERM')}catch{} }
}
const html=await homepage();
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
