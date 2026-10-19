import fs from 'node:fs';
import path from 'node:path';
import {createPriceKeyPackage} from './key-package';
import {runPriceFeed} from './feed';
import {refreshWindow} from './refresh-window';
async function main(){
 for(const name of ['DATABASE_URL','DATABASE_MIGRATION_URL','SIGNER_DATABASE_URL','SIGNER_DECRYPTION_SECRET','SIGNED_PAYLOAD_ENCRYPTION_KEY','FINANCIAL_WORKER_AUTH_KEY'])if(process.env[name])throw new Error('PRICE_FEED_SECRET_SCOPE_MIXED');
 const scheduled=process.env.PRICE_FEED_REFRESH_WINDOW??'false';if(!['true','false'].includes(scheduled))throw new Error('CONFIGURATION_INVALID');
 const operation=process.env.PRICE_FEED_OPERATION??'refresh',environment=process.env.APP_ENV;if(scheduled==='true'&&operation!=='refresh')throw new Error('INVALID_INPUT');if(environment!=='testnet'&&environment!=='mainnet')throw new Error('CONFIGURATION_INVALID');
 if(operation==='prepare_key'){
  const directory=process.argv[2];if(!directory||!path.isAbsolute(directory))throw new Error('INVALID_INPUT');
  const value=createPriceKeyPackage(environment,process.env.PRICE_FEED_DECRYPTION_SECRET??'');fs.mkdirSync(directory,{mode:0o700});fs.writeFileSync(path.join(directory,'encrypted-price-key.json'),JSON.stringify(value,null,2)+'\n',{mode:0o600,flag:'wx'});fs.writeFileSync(path.join(directory,'price-feed-public-key.txt'),value.public_key+'\n',{mode:0o600,flag:'wx'});console.log('Encrypted price key prepared. No database, provider or wallet operation performed.');return;
 }
 if(operation!=='refresh'&&operation!=='manual')throw new Error('INVALID_INPUT');
 if(scheduled==='true'){const result=await refreshWindow(()=>runPriceFeed('refresh'),{report:value=>console.log(JSON.stringify({event:'price_feed',...value}))});console.log(JSON.stringify({event:'price_feed_window',...result}));if(result.failures)process.exitCode=1;return;}
 const result=await runPriceFeed(operation);console.log(JSON.stringify({event:'price_feed',...result}));
}
main().catch(error=>{console.error(error instanceof Error&&/^[A-Z_]{1,80}$/.test(error.message)?error.message:'PROVIDER_UNAVAILABLE');process.exitCode=1});
