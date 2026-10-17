import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {Wallet} from 'ethers';
import {Keypair} from '@solana/web3.js';
import {TronWeb} from 'tronweb';
import {sealKeyEnvelope} from './key-envelope';
import type {Chain,FinancialEnvironment} from '../../packages/chains/src/types';

/** Offline new-key generation only. Never loads a database, RPC or an existing
 * private key. Operators explicitly install a completed encrypted package. */
function main(){
  const environment=process.env.KEY_PACKAGE_ENVIRONMENT;
  if(!['testnet','mainnet'].includes(environment??'')||process.env.KEY_PACKAGE_CONFIRM!=='new-unfunded-keys'||process.env.VERCEL==='1'||process.env.MAINNET_ENABLED!=='false')throw new Error();
  for(const name of ['DATABASE_URL','DATABASE_MIGRATION_URL','SIGNER_DATABASE_URL','SIGNER_KEY_FILE','SIGNER_KEY_FILES_JSON','SIGNED_PAYLOAD_ENCRYPTION_KEY','FINANCIAL_WORKER_AUTH_KEY','SCHEDULER_HMAC_KEY','SCHEDULER_HMAC_PREVIOUS_KEY','AUTH_ACCESS_KEY','AUTH_ACCESS_PREVIOUS_KEY','MFA_ENCRYPTION_KEY','GOOGLE_CLIENT_SECRET','CAPTCHA_SECRET_KEY','SIMULATION_TOOL_AUTH_KEY','EXPORT_ENCRYPTION_KEY'])if(process.env[name])throw new Error();
  const secret=process.env.SIGNER_DECRYPTION_SECRET??'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(secret)||Buffer.from(secret,'base64url').toString('base64url')!==secret||process.argv.length!==3)throw new Error();
  const output=path.resolve(process.argv[2]);
  fs.mkdirSync(output,{mode:0o700}); // Existing directories are never reset.
  const networks:Record<FinancialEnvironment,Record<Chain,string>>={testnet:{eth:'11155111',bnb:'97',sol:'devnet',tron:'nile'},mainnet:{eth:'1',bnb:'56',sol:'mainnet-beta',tron:'mainnet'}};
  const records=[],encryptedKeys:Record<string,string>={};
  for(const chain of ['eth','bnb','sol','tron'] as const){
    const seed=crypto.randomBytes(32);
    let bytes:Buffer|undefined;
    try{
      const network=networks[environment as FinancialEnvironment][chain];
      let address:string|false;
      if(chain==='sol'){
        const pair=Keypair.fromSeed(seed);bytes=Buffer.from(pair.secretKey);address=pair.publicKey.toBase58();
      }else{
        bytes=Buffer.from(seed);
        address=chain==='tron'?TronWeb.address.fromPrivateKey(bytes.toString('hex')):new Wallet('0x'+bytes.toString('hex')).address;
      }
      if(!address)throw new Error();
      const encoded=JSON.stringify(sealKeyEnvelope({chain,environment:environment as FinancialEnvironment,network},address,bytes,secret))+'\n',file=chain+'.encrypted.json';
      fs.writeFileSync(path.join(output,file),encoded,{flag:'wx',mode:0o600});
      encryptedKeys[chain]=encoded;
      records.push({chain,network,public_address:address,file,sha256:crypto.createHash('sha256').update(encoded).digest('hex')});
    }finally{bytes?.fill(0);seed.fill(0)}
  }
  const inventory={format:'gw-encrypted-custody-package-v1',key_format:2,environment,created_at:new Date().toISOString(),keys:records};
  fs.writeFileSync(path.join(output,'inventory.json'),JSON.stringify(inventory,null,2)+'\n',{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(output,'encrypted-key-package.json'),JSON.stringify({format:'gw-encrypted-custody-bundle-v1',inventory,encrypted_keys:encryptedKeys})+'\n',{flag:'wx',mode:0o600});
  console.log('New encrypted custody package prepared. No database, RPC, transfer or activation was used. Preserve it and its separate decryption secret; it does not replace an existing treasury.');
}
try{main()}catch{console.error('Custody packaging failed. Check isolated settings and preserve any partial output; existing keys are never overwritten.');process.exitCode=1}
