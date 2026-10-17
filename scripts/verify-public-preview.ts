import {isReadOnlyPreview,validateRuntimeEnv} from '@gifters/config';
import {db,closeDb,publicPreviewTransaction,publicPreviewManifest} from '@gifters/db';
async function main(){
 if(!isReadOnlyPreview())throw new Error('READ_ONLY_PREVIEW_REQUIRED');
 const environment=validateRuntimeEnv().appEnv;
 if(!['simulation','testnet','mainnet'].includes(environment))throw new Error('CONFIGURATION_INVALID');
 try{await publicPreviewTransaction(db(),environment as 'simulation'|'testnet'|'mainnet',tx=>publicPreviewManifest(tx));console.log('Restricted read-only preview login and public configuration verified; no owner credentials, seeding or financial operations.');}
 finally{await closeDb();}
}
main().catch(()=>{console.error('READ_ONLY_PREVIEW_VERIFICATION_FAILED');process.exitCode=1});
