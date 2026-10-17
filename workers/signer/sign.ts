import {Wallet,getAddress} from 'ethers';
import {Keypair} from '@solana/web3.js';
import {TronWeb,utils} from 'tronweb';
import {base58} from '@scure/base';
import {assertActive} from '../../packages/chains/src/registry';
import type {PreparedTransfer,SignedTransfer} from '../../packages/chains/src/types';
import {assertIsolated,withSigningKey} from './keys';
import {validatePreparedIntent} from './intent-validation';

export async function signPrepared(prepared:PreparedTransfer,nativeCap:bigint):Promise<SignedTransfer>{
 const environment=assertIsolated();
 try{prepared=structuredClone(prepared)}catch{throw new Error('SIGNED_INTENT_INVALID')}
 assertActive(prepared.intent.asset);
 if(prepared.environment!==environment||prepared.intent.asset.environment!==environment)throw new Error('SIGNED_INTENT_INVALID');
 const verified=validatePreparedIntent(prepared,nativeCap);
 // Verify the TRON network reference before opening a private-key file.
 if(verified.family==='tron'){
  const {runtimeAdapter}=await import('../../packages/chains/src/runtime'),chain=await runtimeAdapter(prepared.intent.asset);
  if(!chain.assertReference)throw new Error('SIGNED_INTENT_INVALID');await chain.assertReference(verified.transaction);
 }
 return withSigningKey(prepared.family,prepared.network,async(key,registered)=>{
  if(verified.family==='evm'){
   const wallet=new Wallet('0x'+key.toString('hex'));
   if(getAddress(wallet.address)!==getAddress(registered)||getAddress(wallet.address)!==getAddress(prepared.intent.sender))throw new Error('SIGNER_ADDRESS_MISMATCH');
   const bytes=await wallet.signTransaction(verified.transaction),{keccak256}=await import('ethers');return {bytes,hash:keccak256(bytes),nonce:BigInt(verified.transaction.nonce)};
  }
  if(verified.family==='sol'){
   const pair=Keypair.fromSecretKey(key),tx=verified.transaction;
   if(pair.publicKey.toBase58()!==registered||pair.publicKey.toBase58()!==prepared.intent.sender)throw new Error('SIGNER_ADDRESS_MISMATCH');
   const message=tx.serializeMessage();tx.sign(pair);if(!tx.signature||!tx.serializeMessage().equals(message)||!tx.verifySignatures())throw new Error('SIGNED_INTENT_INVALID');
   return {bytes:tx.serialize().toString('base64'),hash:base58.encode(tx.signature),validUntilHeight:prepared.validUntilHeight};
  }
  const privateHex=key.toString('hex'),address=TronWeb.address.fromPrivateKey(privateHex),tx=verified.transaction;
  if(!address||address!==registered||address!==prepared.intent.sender)throw new Error('SIGNER_ADDRESS_MISMATCH');
  const expectedHash=tx.txID,expectedRaw=tx.raw_data_hex,tron=new TronWeb({fullHost:'http://127.0.0.1:1'}),signed=await tron.trx.sign(tx,privateHex);
  if(typeof signed==='string'||signed.txID!==expectedHash||signed.signature?.length!==1||signed.raw_data_hex!==expectedRaw||!utils.transaction.txCheck(signed))throw new Error('SIGNED_INTENT_INVALID');
  return {bytes:JSON.stringify(signed),hash:signed.txID,expiresAt:prepared.expiresAt};
 });
}
