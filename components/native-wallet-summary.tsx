"use client";
import {formatBaseUnits} from '@gifters/domain';
import type {Locale} from '@/lib/i18n';
export default function NativeWalletSummary({summary,decimals,symbol,locale}:{summary:any;decimals:number;symbol:string;locale:Locale}){
 const fr=locale==='fr';
 return <>
                  <dl className="wallet-summary">
                    <dt>{fr?'Revenu réservé':'Reserved income'}</dt><dd>{formatBaseUnits(BigInt(summary?.income_held_base_units??'0'),decimals)} {symbol}</dd>
                    <dt>{fr?'Remboursement de don réservé':'Reserved gift refunds'}</dt><dd>{formatBaseUnits(BigInt(summary?.refund_held_base_units??'0'),decimals)} {symbol}</dd>
                    <dt>{fr?'Principal de don remboursable':'Returnable gift principal'}</dt><dd>{formatBaseUnits(BigInt(summary?.refundable_base_units??'0'),decimals)} {symbol}</dd>
                    <dt>{fr?'Versements nets réglés':'Settled net payouts'}</dt><dd>{formatBaseUnits(BigInt(summary?.withdrawn_net_base_units??'0'),decimals)} {symbol}</dd>
                    <dt>{fr?'Revenu net':'Net income'}</dt><dd>{formatBaseUnits(BigInt(summary?.net_income_base_units??'0'),decimals)} {symbol}</dd>
                  </dl>
                  <p>{fr?'Le revenu net comprend le revenu disponible, le revenu réservé et les versements nets réglés. Le principal remboursable est distinct.':'Net income includes available income, reserved income and settled net payouts. Refundable principal is separate.'}</p>
</>;
}
