import type {PreparedPayment} from './native-wallet';
/** Only a returned public transaction hash and its review context are retained.
 * No signed bytes, wallet keys, offline mutation queue or automatic resend. */
type Receipt={prepared:PreparedPayment;hash:string};
const receipts=new Map<string,Receipt>();
const flights=new Set<string>();
export function beginPayment(ownerId:string){if(flights.has(ownerId))throw new Error('PAYMENT_PENDING');flights.add(ownerId);}
export function endPayment(ownerId:string){flights.delete(ownerId);}
export function rememberPayment(ownerId:string,prepared:PreparedPayment,hash:string){if(!receipts.has(ownerId)&&receipts.size>=100)receipts.delete(receipts.keys().next().value!);receipts.set(ownerId,{prepared,hash});}
export function pendingPayment(ownerId:string){return receipts.get(ownerId)??null;}
export function forgetPayment(ownerId:string,invoiceId:string){if(receipts.get(ownerId)?.prepared.invoice_id===invoiceId)receipts.delete(ownerId);}
