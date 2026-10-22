import {z} from 'zod';
import {api} from './api-client';
const text=z.string(),amount=text.regex(/^-?[0-9]+$/),next=text.nullable();
const historyRow=z.object({id:text,
 created_at:text,
 ledger_type:text.optional(),
 award_type:text.optional(),
 display_status:text.optional(),
 status:text.optional(),
 points:z.number().int().optional(),
 asset:text.optional(),
 decimals:z.number().int().optional(),
 amount_base_units:amount.optional(),
 net_base_units:amount.optional(),
 expected_base_units:amount.optional(),
 kind:text.optional(),
 purpose:text.optional(),
 direction:text.optional(),
 environment:text.optional(),
 network:text.optional(),
 explorer:text.nullable().optional(),
 tx_hash:text.nullable().optional()});
const receipt=z.object({id:text,
 asset:text,
 decimals:z.number().int(),
 environment:z.enum(['simulation','testnet','mainnet']),
 chain_id:text,
 net_base_units:amount,
 fee_base_units:amount,
 refunded_fee_base_units:amount.optional(),
 settled_at:text,
 explorer:text.nullable().optional(),
 tx_hash:text.nullable().optional()});
const schemas={
 data:z.array(z.object({id:text,
 status:text,
 expires_at:text,
 parts:z.number().int().nonnegative(),
 error_code:text.nullable()})),
 history:z.object({rows:z.array(historyRow),
 next_after:next}),
 points:z.object({total:amount,
 rows:z.array(historyRow),
 next_after:next}),
 referrals:z.object({code:text.nullable(),
 consented_signups:amount}),
 share:z.object({rows:z.array(receipt),
 next_after:next}),
 notifications:z.object({items:z.array(z.object({id:text,
 title_key:text,
 body:text,
 created_at:text,
 read_at:text.nullable()})),
 next_cursor:next}),
};
export type MemberKind=keyof typeof schemas;
export type MemberFeature={[K in MemberKind]:{kind:K;value:z.infer<(typeof schemas)[K]>}}[MemberKind];
export type WithdrawalReceipt=z.infer<typeof receipt>;
export function parseMemberFeature<K extends MemberKind>(kind:K,
 value:unknown):Extract<MemberFeature,{kind:K}>{
 // The indexed schema and discriminator are selected together; callers never
 // cast unvalidated transport data into a feature's state.
 return {kind,
 value:schemas[kind].parse(value)} as Extract<MemberFeature,{kind:K}>;
}
export async function loadMemberFeature(kind:MemberKind,
 path:string,
 owner:string){return parseMemberFeature(kind,await api<unknown>(path,owner));}
export function featureCursor(data:MemberFeature|null){if(!data)return null;return 'next_after'in data.value?data.value.next_after:'next_cursor'in data.value?data.value.next_cursor:null;}
export function appendMemberFeature(old:MemberFeature|null,
 value:MemberFeature):MemberFeature{
 if(!old||old.kind!==value.kind)return value;
 switch(value.kind){
  case 'history':return {...value,
 value:{...value.value,
 rows:[...(old.kind==='history'?old.value.rows:[]),...value.value.rows].slice(-500)}};
  case 'points':return {...value,
 value:{...value.value,
 rows:[...(old.kind==='points'?old.value.rows:[]),...value.value.rows].slice(-500)}};
  case 'share':return {...value,
 value:{...value.value,
 rows:[...(old.kind==='share'?old.value.rows:[]),...value.value.rows].slice(-500)}};
  default:return value;
 }
}
