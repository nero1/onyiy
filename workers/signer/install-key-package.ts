import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {assertNetworkBinding} from '../../packages/chains/src/network';
import {openKeyEnvelope} from './key-envelope';
import {assertIsolated} from './keys';

const chain=z.enum(['eth','bnb','sol','tron']);
const inventory=z.object({format:z.literal('gw-encrypted-custody-package-v1'),key_format:z.literal(2),environment:z.enum(['testnet','mainnet']),created_at:z.string().datetime(),keys:z.array(z.object({chain,network:z.string().max(100),public_address:z.string().max(100),file:z.string().max(100),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()).length(4)}).strict();
const bundle=z.object({format:z.literal('gw-encrypted-custody-bundle-v1'),inventory,encrypted_keys:z.object({eth:z.string().max(4096),bnb:z.string().max(4096),sol:z.string().max(4096),tron:z.string().max(4096)}).strict()}).strict();

/** Only a newly created private directory is written. Validate/decrypt every
 * encrypted record before writing any file; never contact a database or RPC. */
export function installKeyPackage(raw:string,output:string){
 const environment=assertIsolated(),secret=process.env.SIGNER_DECRYPTION_SECRET??'';
 if(Buffer.byteLength(raw)>32768||secret.length<32||secret.length>1024||/[\r\n]/.test(output))throw new Error('SIGNER_KEY_PACKAGE_INVALID');
 const parsed=bundle.parse(JSON.parse(raw));
 if(parsed.inventory.environment!==environment||new Set(parsed.inventory.keys.map(row=>row.chain)).size!==4)throw new Error('SIGNER_KEY_PACKAGE_INVALID');
 for(const row of parsed.inventory.keys){
  assertNetworkBinding({chain:row.chain,environment,network:row.network});
  const encoded=parsed.encrypted_keys[row.chain];
  if(row.file!==row.chain+'.encrypted.json'||crypto.createHash('sha256').update(encoded).digest('hex')!==row.sha256)throw new Error('SIGNER_KEY_PACKAGE_INVALID');
  const envelope=JSON.parse(encoded);if(envelope.version!==2)throw new Error('SIGNER_KEY_PACKAGE_INVALID');
  const opened=openKeyEnvelope(envelope,{chain:row.chain,environment,network:row.network},secret);
  try{if(opened.address!==row.public_address)throw new Error('SIGNER_KEY_PACKAGE_INVALID')}finally{opened.bytes.fill(0)}
 }
 const root=path.resolve(output),files:Record<string,string>={};
 fs.mkdirSync(root,{mode:0o700});
 for(const row of parsed.inventory.keys){const file=path.join(root,row.file);fs.writeFileSync(file,parsed.encrypted_keys[row.chain],{flag:'wx',mode:0o600});files[row.chain]=file;}
 fs.writeFileSync(path.join(root,'key-files.json'),JSON.stringify(files)+'\n',{flag:'wx',mode:0o600});
 return files;
}
if(process.argv[1]?.endsWith('/install-key-package.ts'))try{
 if(process.argv.length!==3)throw Error();
 const files=installKeyPackage(process.env.SIGNER_KEY_PACKAGE_JSON??'',process.argv[2]);
 if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,'SIGNER_KEY_FILES_JSON='+JSON.stringify(files)+'\n');
 console.log('Validated encrypted custody package installed in a new private directory; no database, RPC or transfer was used.');
}catch{console.error('SIGNER_KEY_PACKAGE_INVALID: preserve the package and any partial output; no existing key files are overwritten.');process.exitCode=1;}
