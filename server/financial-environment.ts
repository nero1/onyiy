import {nativePaymentEnvironment,runtimeProviders} from '@gifters/config';
import {sql} from 'drizzle-orm';
import type {DbExecutor} from '@gifters/db';
export function assertFinancialEnvironment() {
  return nativePaymentEnvironment();
}
export async function financialEnvironmentIn(tx:DbExecutor){
 const environment=assertFinancialEnvironment();
 const [scope]=await tx.execute<{environment:string}>(sql`select current_setting('gw.environment',true) as environment`);
 if(scope?.environment!==environment)throw new Error('FINANCIAL_ENVIRONMENT_DENIED');
 return environment;
}
/** Alerts also serve simulation jobs; native scopes retain the execution gate. */
export async function operationalEnvironmentIn(tx:DbExecutor,expected?:'simulation'|'testnet'|'mainnet'){
 const [scope]=await tx.execute<{environment:string}>(sql`select current_setting('gw.environment',true) as environment`);
 const environment=scope?.environment;
 if(environment!=='simulation'&&environment!=='testnet'&&environment!=='mainnet'||expected!==undefined&&environment!==expected)throw new Error('FINANCIAL_ENVIRONMENT_DENIED');
 if(environment==='simulation'){
  if((process.env.APP_ENV??'simulation')!=='simulation')throw new Error('FINANCIAL_ENVIRONMENT_DENIED');
  runtimeProviders();
 }else await financialEnvironmentIn(tx);
 return environment;
}
