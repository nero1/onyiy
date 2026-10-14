import {z} from 'zod';
import type {cryptoObligations} from '@gifters/db';
import type {NativeWithdrawalQuote} from '@/lib/financial-contracts';
const amount=z.string().regex(/^(0|[1-9][0-9]{0,77})$/);
const approvedCharges=z.object({network_charge_base_units:amount,account_setup_charge_base_units:amount});
/** Narrow member-facing quote projection; immutable source evidence stays in
 * the service. Invalid persisted charges fail closed before a review is shown. */
export function nativeWithdrawalQuote(row:typeof cryptoObligations.$inferSelect):NativeWithdrawalQuote{
 const parsed=approvedCharges.safeParse(row.feeSnapshot);
 if(!parsed.success)throw new Error('FINANCIAL_SAFETY_PAUSE');
 return {id:row.id,grossBaseUnits:row.grossBaseUnits,chargeBaseUnits:row.chargeBaseUnits,
  netBaseUnits:row.netBaseUnits,destination:row.destination,quoteExpiresAt:row.quoteExpiresAt.toISOString(),status:row.status,
  feeSnapshot:parsed.data};
}
