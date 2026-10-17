import crypto from 'node:crypto';
import {getAddress,Interface} from 'ethers';
import {PublicKey,Transaction,SystemProgram} from '@solana/web3.js';
import {ASSOCIATED_TOKEN_PROGRAM_ID,getAssociatedTokenAddressSync,createAssociatedTokenAccountIdempotentInstruction,createTransferCheckedInstruction} from '@solana/spl-token';
import {TronWeb,utils} from 'tronweb';
import {assertNetworkBinding} from '../../packages/chains/src/network';
import type {PreparedTransfer} from '../../packages/chains/src/types';
const erc20=new Interface(['function transfer(address,uint256) returns (bool)']);
function invalid():never{throw new Error('SIGNED_INTENT_INVALID')}
function integer(value:unknown){
 if(typeof value==='number'&&(!Number.isSafeInteger(value)||value<0))invalid();
 if(typeof value!=='number'&&(typeof value!=='string'||!/^(0|[1-9][0-9]*)$/.test(value)))invalid();
 return BigInt(value as string|number);
}
/** Pure validation does not read keys, call RPCs, sign or broadcast. */
export function validatePreparedIntent(prepared:PreparedTransfer,nativeCap:bigint){
 try{
  const intent=prepared.intent,fee=intent.fee;
  assertNetworkBinding(intent.asset);
  if(prepared.environment!==intent.asset.environment||prepared.network!==intent.asset.network||prepared.family!==intent.asset.chain||typeof intent.amount!=='bigint'||intent.amount<=0n||typeof nativeCap!=='bigint'||typeof fee.nativeFee!=='bigint'||fee.nativeFee<0n||nativeCap<fee.nativeFee)invalid();
  const setup=fee.accountSetupCost??0n;
  if(typeof setup!=='bigint'||setup<0n||setup>fee.nativeFee||fee.networkFee!==undefined&&(typeof fee.networkFee!=='bigint'||fee.networkFee<0n||fee.networkFee+setup!==fee.nativeFee))invalid();
  if(prepared.family==='eth'||prepared.family==='bnb'){
   const value=prepared.payload as Record<string,unknown>,amount=integer(value.value),gasLimit=integer(value.gasLimit),gasPrice=integer(value.gasPrice),nonce=integer(value.nonce);
   if(getAddress(intent.sender)===getAddress(intent.destination)||getAddress(String(value.to))!==getAddress(intent.asset.kind==='native'?intent.destination:intent.asset.contract!)||String(value.data)!==(intent.asset.kind==='native'?'0x':erc20.encodeFunctionData('transfer',[getAddress(intent.destination),intent.amount]))||amount!==(intent.asset.kind==='native'?intent.amount:0n)||gasLimit<21000n||gasPrice<=0n||gasLimit!==fee.gasLimit||gasPrice!==fee.unitPrice||gasLimit*gasPrice!==fee.nativeFee||integer(value.chainId)!==BigInt(prepared.network)||nonce!==intent.nonce||nonce>BigInt(Number.MAX_SAFE_INTEGER)||value.type!==0)invalid();
   return {family:'evm' as const,transaction:{to:String(value.to),data:String(value.data),value:amount,gasLimit,gasPrice,nonce:Number(nonce),chainId:BigInt(prepared.network),type:0 as const}};
  }
  if(prepared.family==='sol'){
   const payer=new PublicKey(intent.sender),destination=new PublicKey(intent.destination),tx=Transaction.from(Buffer.from(String(prepared.payload),'base64')),validity=fee.validity;
   if(payer.equals(destination)||!validity||!tx.feePayer?.equals(payer)||tx.recentBlockhash!==validity.blockhash||prepared.validUntilHeight!==validity.lastValidBlockHeight||tx.signatures.some(value=>value.signature!==null))invalid();
   const expected=new Transaction({feePayer:payer,recentBlockhash:validity.blockhash});
   if(intent.asset.kind==='native')expected.add(SystemProgram.transfer({fromPubkey:payer,toPubkey:destination,lamports:intent.amount}));
   else{
    const mint=new PublicKey(intent.asset.mint!),from=getAssociatedTokenAddressSync(mint,payer),to=getAssociatedTokenAddressSync(mint,destination),creations=tx.instructions.filter(value=>value.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID));
    if(creations.length>1)invalid();
    if(creations.length){if((fee.accountSetupCost??0n)<=0n)invalid();expected.add(createAssociatedTokenAccountIdempotentInstruction(payer,to,destination,mint));}
    expected.add(createTransferCheckedInstruction(from,mint,to,payer,intent.amount,intent.asset.decimals));
   }
   if(!expected.serializeMessage().equals(tx.serializeMessage()))invalid();
   return {family:'sol' as const,transaction:tx};
  }
  const tx=prepared.payload as any,contract=tx.raw_data?.contract?.[0],hex=(value:string)=>TronWeb.address.toHex(value).toLowerCase(),expiration=integer(tx.raw_data?.expiration);
  if(hex(intent.sender)===hex(intent.destination)||tx.signature?.length||!utils.transaction.txCheck(tx)||tx.raw_data.contract.length!==1||integer(contract.Permission_id??0)!==0n||contract.parameter.value.owner_address.toLowerCase()!==hex(intent.sender)||expiration<=BigInt(Date.now())||expiration>BigInt(Date.now()+600000)||!(prepared.expiresAt instanceof Date)||BigInt(prepared.expiresAt.getTime())!==expiration||tx.txID!==crypto.createHash('sha256').update(Buffer.from(tx.raw_data_hex,'hex')).digest('hex'))invalid();
  if(intent.asset.kind==='native'){
   if(intent.asset.key!=='trx'||contract.type!=='TransferContract'||contract.parameter.value.to_address.toLowerCase()!==hex(intent.destination)||integer(contract.parameter.value.amount)!==intent.amount||integer(tx.raw_data.fee_limit??0)!==0n)invalid();
  }else{
   const value=contract.parameter.value,energy=fee.gasLimit*fee.unitPrice;
   if(fee.gasLimit<0n||fee.unitPrice<0n||energy>fee.nativeFee||contract.type!=='TriggerSmartContract'||value.contract_address.toLowerCase()!==hex(intent.asset.contract!)||value.data.toLowerCase()!==erc20.encodeFunctionData('transfer',['0x'+hex(intent.destination).slice(-40),intent.amount]).slice(2).toLowerCase()||integer(value.call_value??0)!==0n||integer(value.call_token_value??0)!==0n||integer(value.token_id??0)!==0n||integer(tx.raw_data.fee_limit??0)!==energy)invalid();
  }
  return {family:'tron' as const,transaction:tx};
 }catch{invalid()}
}
