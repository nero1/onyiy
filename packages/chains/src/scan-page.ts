import {solanaGenesis,tronChainId} from './network';
import {getAddress,Interface,id} from 'ethers';
import {TronWeb} from 'tronweb';
import {base58} from '@scure/base';
import {DualRpc,integer,quantity} from './rpc';
import {canonicalTransactionHash} from './hash';
import type {AssetRegistry,ScannedTransfer,TransferScanCursor,TransferScanPage} from './types';
const erc20=new Interface(['event Transfer(address indexed from,address indexed to,uint256 value)']);
const tokenProgram='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const systemProgram='11111111111111111111111111111111';
const transferTopic=id('Transfer(address,address,uint256)').slice(2);
const digest=(v:unknown)=>JSON.stringify(v,(_k,x)=>typeof x==='bigint'?x.toString():x);
const hex=(v:bigint)=>'0x'+v.toString(16);
function number(v:bigint){if(v<0n||v>9007199254740991n)throw new Error('SCAN_RANGE_INVALID');return parseInt(v.toString(),10)}
function solAddress(value:string){try{if(base58.decode(value).length!==32)throw Error();return value}catch{throw new Error('RPC_EVIDENCE_INVALID')}}
function tronAddress(value:string){if(!TronWeb.isAddress(value))throw new Error('RPC_EVIDENCE_INVALID');return TronWeb.address.fromHex(TronWeb.address.toHex(value)) as string}
function normalize(asset:AssetRegistry,address:string){return asset.chain==='sol'?solAddress(address):asset.chain==='tron'?tronAddress(address):getAddress(address)}
function next(height:bigint,hash:string,tx:number,event:number,totalTx:number):TransferScanPage {
  return tx>=totalTx?{through:height,cursor:{height:(height+1n).toString(),transaction:0,event:0},transfers:[]}
    :{through:height-1n,cursor:{height:height.toString(),transaction:tx,event,blockHash:hash},transfers:[]};
}
/** One transaction and at most50 event/instruction slots per provider. Cursor
 * advancement never denotes a completed block until all its slots are covered. */
export async function scanTransferPage(asset:AssetRegistry,rpc:DualRpc,address:string,after:bigint,through:bigint,cursor?:TransferScanCursor):Promise<TransferScanPage>{
  if(after<0n||through<=after)throw new Error('SCAN_RANGE_INVALID');
  const position=cursor??{height:(after+1n).toString(),transaction:0,event:0};
  if(!/^(0|[1-9][0-9]{0,77})$/.test(position.height)||BigInt(position.height)!==after+1n||!Number.isSafeInteger(position.transaction)||position.transaction<0||position.transaction>100000||!Number.isSafeInteger(position.event)||position.event<0||position.event>100000)throw new Error('SCAN_CURSOR_INVALID');
  const account=normalize(asset,address),height=BigInt(position.height);
  const results=await Promise.all(([0,1] as const).map(async side=>{
    let block:any,hash:string,transactions:any[],record:any,selectedHash:string,producedSlots:string[]|undefined;
    if(asset.chain==='eth'||asset.chain==='bnb'){
      if(quantity(await rpc.request(side,'eth_chainId',[]))!==BigInt(asset.network))throw new Error('WRONG_NETWORK');
      const tip=await rpc.request(side,'eth_getBlockByNumber',[asset.finality.mode==='depth'?'latest':'finalized',false]);
      if(!tip||quantity(tip.number)<height+(asset.finality.mode==='depth'?BigInt(asset.finality.depth??0):0n))throw new Error('FINALITY_UNAVAILABLE');
      block=await rpc.request(side,'eth_getBlockByNumber',[hex(height),false]);
      if(!block||quantity(block.number)!==height||!/^0x[0-9a-f]{64}$/i.test(block.hash)||!Array.isArray(block.transactions))throw new Error('RPC_EVIDENCE_INVALID');
      hash=block.hash.toLowerCase();transactions=block.transactions;
    }else if(asset.chain==='sol'){
      if(await rpc.request(side,'getGenesisHash',[])!==solanaGenesis(asset.environment))throw new Error('WRONG_NETWORK');
      const rangeEnd=height+4n<through?height+4n:through;
      if(integer(await rpc.request(side,'getSlot',[{commitment:'finalized'}]))<rangeEnd)throw new Error('FINALITY_UNAVAILABLE');
      const slots=await rpc.request(side,'getBlocks',[number(height),number(rangeEnd),{commitment:'finalized'}]);
      if(!Array.isArray(slots)||slots.length>5||slots.some((v:unknown,i:number)=>integer(v)<height||integer(v)>rangeEnd||(i>0&&integer(v)<=integer(slots[i-1]))))throw new Error('RPC_EVIDENCE_INVALID');
      producedSlots=slots.map((v:unknown)=>integer(v).toString());
      if(!slots.length){if(position.transaction||position.event||position.blockHash)throw new Error('RPC_SCAN_CONTRADICTION');return {...next(rangeEnd,'',0,0,0),producedSlots}}
      if(integer(slots[0])>height){if(position.transaction||position.event||position.blockHash)throw new Error('RPC_SCAN_CONTRADICTION');return {through:integer(slots[0])-1n,cursor:{height:integer(slots[0]).toString(),transaction:0,event:0},transfers:[],producedSlots}}
      block=await rpc.request(side,'getBlock',[number(height),{commitment:'finalized',transactionDetails:'signatures',rewards:false,maxSupportedTransactionVersion:0}]);
      if(!block||base58.decode(block.blockhash).length!==32||!Array.isArray(block.signatures))throw new Error('RPC_EVIDENCE_INVALID');
      hash=block.blockhash;transactions=block.signatures;
    }else{
      const identity=await rpc.post(side,'jsonrpc',{jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]},true);
      if(BigInt(identity)!==tronChainId(asset.network))throw new Error('WRONG_NETWORK');
      const tip=await rpc.post(side,'walletsolidity/getnowblock',{});
      if(integer(tip?.block_header?.raw_data?.number)<height)throw new Error('FINALITY_UNAVAILABLE');
      block=await rpc.post(side,'walletsolidity/getblockbynum',{num:number(height)});
      if(integer(block?.block_header?.raw_data?.number)!==height||!/^[0-9a-f]{64}$/i.test(block.blockID)||!Array.isArray(block.transactions??[]))throw new Error('RPC_EVIDENCE_INVALID');
      hash=block.blockID.toLowerCase();transactions=block.transactions??[];
    }
    if(position.blockHash&&position.blockHash!==hash)throw new Error('RPC_SCAN_CONTRADICTION');
    if(transactions.length>100000||position.transaction>transactions.length)throw new Error('SCAN_CURSOR_INVALID');
    if(position.transaction===transactions.length)return {...next(height,hash,position.transaction,0,transactions.length),...(producedSlots?{producedSlots}:{})};
    const item=transactions[position.transaction];
    if(asset.chain==='eth'||asset.chain==='bnb'){
      selectedHash=canonicalTransactionHash(asset.chain,item);
      record=asset.kind==='native'?await rpc.request(side,'eth_getTransactionByHash',[selectedHash]):await rpc.request(side,'eth_getTransactionReceipt',[selectedHash]);
      if(!record||String(asset.kind==='native'?record.hash:record.transactionHash).toLowerCase()!==selectedHash||String(record.blockHash).toLowerCase()!==hash||quantity(record.blockNumber)!==height||quantity(record.transactionIndex)!==BigInt(position.transaction))throw new Error('SCAN_INCOMPLETE');
    }else if(asset.chain==='sol'){
      selectedHash=canonicalTransactionHash('sol',item);
      record=await rpc.request(side,'getTransaction',[selectedHash,{commitment:'finalized',encoding:'jsonParsed',maxSupportedTransactionVersion:0}]);
      if(!record||integer(record.slot)!==height||record.transaction?.signatures?.[0]!==selectedHash)throw new Error('SCAN_INCOMPLETE');
    }else{
      selectedHash=canonicalTransactionHash('tron',item.txID);
      record=asset.kind==='native'?item:await rpc.post(side,'walletsolidity/gettransactioninfobyid',{value:selectedHash});
      if(asset.kind==='token'&&(String(record.id).toLowerCase()!==selectedHash||integer(record.blockNumber)!==height))throw new Error('SCAN_INCOMPLETE');
    }
    const events=asset.chain==='sol'?(record.transaction?.message?.instructions??[]):asset.kind==='token'?(asset.chain==='tron'?record.log??[]:record.logs??[]):[record];
    if(!Array.isArray(events)||events.length>100000||position.event>events.length)throw new Error('SCAN_CURSOR_INVALID');
    const stop=Math.min(events.length,position.event+50);let candidate:ScannedTransfer|undefined,event=position.event;
    for(;event<stop;event++){
      const value=events[event];let sender:string,destination:string,amount:bigint,index=event;
      if(asset.chain==='eth'||asset.chain==='bnb'){
        if(asset.kind==='native'){if(!value.to)continue;sender=getAddress(value.from);destination=getAddress(value.to);amount=quantity(value.value);index=0}
        else{if(getAddress(value.address)!==getAddress(asset.contract!))continue;const parsed=erc20.parseLog(value);if(!parsed||parsed.name!=='Transfer')continue;sender=getAddress(parsed.args.from);destination=getAddress(parsed.args.to);amount=BigInt(parsed.args.value);index=number(quantity(value.logIndex))}
      }else if(asset.chain==='sol'){
        if(record.meta?.err)continue;const info=value.parsed?.info;
        if(asset.kind==='native'){if(value.programId!==systemProgram||value.parsed?.type!=='transfer')continue;sender=solAddress(info.source);destination=solAddress(info.destination);amount=integer(info.lamports)}
        else{if(value.programId!==tokenProgram||value.parsed?.type!=='transferChecked'||info.mint!==asset.mint)continue;if(info.tokenAmount?.decimals!==asset.decimals)throw new Error('TOKEN_REGISTRY_MISMATCH');const keys=record.transaction.message.accountKeys;const source=record.meta.preTokenBalances?.find((v:any)=>keys[v.accountIndex]?.pubkey===info.source&&v.mint===asset.mint),target=record.meta.postTokenBalances?.find((v:any)=>keys[v.accountIndex]?.pubkey===info.destination&&v.mint===asset.mint);if(!source?.owner||!target?.owner)throw new Error('SCAN_INCOMPLETE');sender=solAddress(source.owner);destination=solAddress(target.owner);amount=integer(info.tokenAmount.amount)}
      }else{
        if(asset.kind==='native'){const contracts=value.raw_data?.contract;if(contracts?.length!==1||contracts[0].type!=='TransferContract')continue;const info=contracts[0].parameter.value;sender=tronAddress(info.owner_address);destination=tronAddress(info.to_address);amount=integer(info.amount);index=0}
        else{if(!/^[0-9a-f]{40}$/i.test(value.address)||tronAddress('41'+value.address)!==tronAddress(asset.contract!)||value.topics?.length!==3||value.topics[0]?.toLowerCase()!==transferTopic)continue;sender=tronAddress('41'+value.topics[1].slice(-40));destination=tronAddress('41'+value.topics[2].slice(-40));amount=BigInt('0x'+value.data)}
      }
      if(amount<=0n||sender===destination||(sender!==account&&destination!==account))continue;
      candidate={hash:selectedHash,index,sender,destination,amount,height,blockHash:hash,direction:destination===account?'incoming':'outgoing'};event++;break;
    }
    const page=event>=events.length?next(height,hash,position.transaction+1,0,transactions.length):next(height,hash,position.transaction,event,transactions.length);
    if(candidate)page.transfers.push(candidate);if(producedSlots)page.producedSlots=producedSlots;return page;
  }));
  if(digest(results[0])!==digest(results[1]))throw new Error('RPC_SCAN_CONTRADICTION');return results[0];
}
