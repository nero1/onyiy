import {sql} from 'drizzle-orm';
import type {DbExecutor} from './index';

/** One protected asset/purpose aggregate after coverage seals. The SQL helper
 * enforces service/environment scope and preserves exact bootstrap fallback. */
async function readAssetBalance(database:DbExecutor,assetId:string,purposes:readonly string[],signer:boolean) {
  if(!purposes.length||purposes.length>20)throw new Error('INVALID_INPUT');
  const values=sql.join(purposes.map(purpose=>sql`${purpose}`),sql`, `);
  const expression=signer?sql`public.gw_signer_asset_balance(${assetId}::uuid,array[${values}]::text[])`:sql`public.gw_asset_balance(${assetId}::uuid,array[${values}]::text[])`;
  const [row]=await database.execute<{amount:string}>(sql`select ${expression}::text as amount`);
  if(!row||! /^-?[0-9]+$/.test(row.amount))throw new Error('FINANCIAL_SAFETY_PAUSE');
  return BigInt(row.amount);
}

export const assetLedgerBalance=(database:DbExecutor,assetId:string,purposes:readonly string[])=>readAssetBalance(database,assetId,purposes,false);
export const signerAssetLedgerBalance=(database:DbExecutor,assetId:string,purposes:readonly string[])=>readAssetBalance(database,assetId,purposes,true);
