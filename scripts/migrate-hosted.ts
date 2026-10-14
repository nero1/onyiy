import {spawn} from 'node:child_process';
import {validateRuntimeEnv} from '@gifters/config';

// Loaded with the same protected Vercel environment file used by preflight.
// Migration credentials exist only in this GitHub process, never Vercel output.
async function main(){
const selected=validateRuntimeEnv();
if(!process.env.DATABASE_MIGRATION_URL||selected.appEnv==='mainnet'||process.env.SIGNER_PROVIDER!=='disabled'||process.env.MAINNET_ENABLED!=='false')throw new Error('HOSTED_MIGRATION_CONFIGURATION_INVALID');
for(const command of ['db:check:binding','db:migrate','db:seed','db:check:runtime']){
 await new Promise<void>((resolve,reject)=>{
  const child=spawn('npm',['run',command],{stdio:'inherit',env:process.env,shell:false});
  child.once('error',()=>reject(new Error('HOSTED_MIGRATION_FAILED')));
  child.once('exit',code=>code===0?resolve():reject(new Error('HOSTED_MIGRATION_FAILED')));
 });
}
}
main().catch(()=>{console.error('HOSTED_MIGRATION_FAILED');process.exitCode=1});
