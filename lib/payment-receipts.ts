import type {PreparedPayment} from './native-wallet';
/** Only a returned public transaction hash and its review context are retained.
 * No signed bytes, wallet keys, offline mutation queue or automatic resend. */
type Receipt={prepared:PreparedPayment;hash:string};
const receipts=new Map<string,Receipt>();
const flights=new Set<string>();
export const paymentFlightEvent='gw:payment-flight';
function changed(){if(typeof window!=='undefined')window.dispatchEvent(new Event(paymentFlightEvent));}
const walletInteractions=new Set<symbol>();
export function paymentInFlight(){return flights.size>0||walletInteractions.size>0;}
/** Cover connection and ownership prompts too, including logged-out recovery. */
export async function withWalletInteraction<T>(action:()=>Promise<T>){const token=Symbol();walletInteractions.add(token);changed();try{return await action()}finally{walletInteractions.delete(token);changed();}}
export function beginPayment(ownerId:string){if(flights.has(ownerId))throw new Error('PAYMENT_PENDING');flights.add(ownerId);changed();}
export function endPayment(ownerId:string){flights.delete(ownerId);changed();}
export function rememberPayment(ownerId:string,prepared:PreparedPayment,hash:string){if(!receipts.has(ownerId)&&receipts.size>=100)receipts.delete(receipts.keys().next().value!);receipts.set(ownerId,{prepared,hash});changed();}
export function pendingPayment(ownerId:string){return receipts.get(ownerId)??null;}
export function forgetPayment(ownerId:string,invoiceId:string){if(receipts.get(ownerId)?.prepared.invoice_id===invoiceId)receipts.delete(ownerId);changed();}
