import {selectedPaymentEnvironment} from '@gifters/config';
import type {Manifest} from '@gifters/config';
export function presentationFromManifest(manifest:Manifest){
 if(selectedPaymentEnvironment()==='mainnet'&&(manifest.deployment_profile!=='transparent'||!manifest.feature_transparency||!['verified','disabled'].includes(manifest.activity_presentation)||manifest.feature_simulation))throw new Error('CONFIGURATION_INVALID');
 const transparent=manifest.deployment_profile==='transparent';
 return {revision:manifest.profile_revision,profile:manifest.deployment_profile,enabled:manifest.feature_transparency,transparent,
  bootstrap:transparent?(!manifest.feature_bootstrap?'disabled':manifest.bootstrap_presentation):'legacy',
  priority:transparent?(!manifest.feature_priority?'disabled':manifest.priority_presentation):'legacy',
  activity:!manifest.feature_activity?'disabled':manifest.activity_presentation,content:manifest.transparency_content,
  queue:manifest.queue_disclosure_policy,receipt:manifest.public_receipt_policy,
  split_bps:manifest.payment_split_bps,empty_queue:manifest.empty_queue_policy,
  payment_environment:selectedPaymentEnvironment(),
  non_real_money:process.env.APP_ENV!=='mainnet',client_poll_seconds:manifest.transparency_snapshot_policy.client_poll_seconds};
}
export type ProfilePresentation=ReturnType<typeof presentationFromManifest>;

export type PublicQueueDisclosure={system_positions:string;system_remaining_slots:string;priority_positions:string;queue_revision:string;snapshot_at:string};
export type QueueDisclosure=Omit<PublicQueueDisclosure,'priority_positions'>&{joining_number:string;serving_position:string;system_ahead:string;priority_ahead:string};

import {decimalToBaseUnits,formatBaseUnits} from '@gifters/domain';
type PlanAmounts={amountBaseUnits:string;usdReference:string;receiverBps:number;marketingBps:number;referralBps:number;developerBps:number;reserveBps:number;receiptsRequired:number};
export function planFinancialPresentation(plan:PlanAmounts,asset:{symbol:string;decimals:number;chainId:string;environment:string}){
 const potential=BigInt(plan.amountBaseUnits)*BigInt(plan.receiverBps)/10000n*BigInt(plan.receiptsRequired);
 const usd=decimalToBaseUnits(plan.usdReference,2)*BigInt(plan.receiverBps)/10000n*BigInt(plan.receiptsRequired);
 return {asset:asset.symbol,decimals:asset.decimals,network:asset.chainId,environment:asset.environment,receipts_required:plan.receiptsRequired,
  potential_receipts_base_units:potential.toString(),potential_receipts:formatBaseUnits(potential,asset.decimals),estimated_reference_usd:formatBaseUnits(usd,2),
  allocation_split_bps:{receiver:plan.receiverBps,marketing:plan.marketingBps,referral:plan.referralBps,developer:plan.developerBps,reserve:plan.reserveBps}};
}
export type PlanFinancialPresentation=ReturnType<typeof planFinancialPresentation>;
