import {z} from 'zod';
const id=z.number().int().positive().max(2147483647);
const mapping=z.object({eth:id.optional(),bnb:id.optional(),sol:id.optional(),trx:id.optional(),usdt_bnb:id.optional(),usdt_sol:id.optional(),usdt_tron:id.optional(),jaga_bnb:id.optional()}).strict();
export type PriceAssetKey=keyof z.infer<typeof mapping>;
/** Operator-reviewed market IDs; ticker symbols never select an oracle asset. */
export function coinMarketCapIds(env:NodeJS.ProcessEnv=process.env){
 const raw=env.COINMARKETCAP_IDS_JSON;
 if(!raw||Buffer.byteLength(raw)>2048)throw new Error('PROVIDER_UNAVAILABLE');
 try{const value=mapping.parse(JSON.parse(raw));if(!Object.keys(value).length)throw Error();return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))) as z.infer<typeof mapping>;}catch{throw new Error('CONFIGURATION_INVALID');}
}
export function nativePriceKey(chain:'eth'|'bnb'|'sol'|'tron'):PriceAssetKey{return chain==='tron'?'trx':chain;}
