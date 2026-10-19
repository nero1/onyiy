/** Preserve JSON number lexemes: converting a price to a JS Number loses digits. */
export class ProviderNumber{constructor(readonly text:string){}}
export function providerJson(text:string):unknown{
 if(Buffer.byteLength(text)>524288)throw new Error('PRICE_INVALID');
 let index=0,nodes=0;
 const fail=():never=>{throw new Error('PRICE_INVALID')};
 const space=()=>{while(index<text.length&&/[ \t\r\n]/.test(text[index]))index++};
 function string(){const start=index++;for(;index<text.length;index++){if(text[index]==='\\'){index++;continue}if(text[index]==='"'){index++;try{const value:unknown=JSON.parse(text.slice(start,index));if(typeof value!=='string'||value.length>8192)return fail();return value}catch{return fail()}}}return fail()}
 function value(depth:number):unknown{
  if(depth>16||++nodes>10000)return fail();space();const c=text[index];
  if(c==='"')return string();
  if(c==='{'){index++;const object:Record<string,unknown>=Object.create(null),keys=new Set<string>();space();if(text[index]==='}'){index++;return object}for(;;){space();if(text[index]!=='"')return fail();const key=string();if(keys.has(key))return fail();keys.add(key);space();if(text[index++]!==':')return fail();object[key]=value(depth+1);space();const next=text[index++];if(next==='}')return object;if(next!==',')return fail();}}
  if(c==='['){index++;const array:unknown[]=[];space();if(text[index]===']'){index++;return array}for(;;){array.push(value(depth+1));space();const next=text[index++];if(next===']')return array;if(next!==',')return fail();}}
  for(const [token,result]of [['true',true],['false',false],['null',null]] as const)if(text.startsWith(token,index)){index+=token.length;return result;}
  const match=/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(index));if(!match||match[0].length>128)return fail();index+=match[0].length;return new ProviderNumber(match[0]);
 }
 const result=value(0);space();if(index!==text.length)return fail();return result;
}
/** Round the reference rate half-up to the existing18-decimal price scale. */
export function providerPrice(value:unknown){
 if(!(value instanceof ProviderNumber)||value.text.startsWith('-'))throw new Error('PRICE_INVALID');
 const match=/^(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d{1,3}))?$/.exec(value.text);if(!match)throw new Error('PRICE_INVALID');
 const fraction=match[2]??'',exponent=Number(match[3]??0),shift=18+exponent-fraction.length;
 if(Math.abs(exponent)>100||Math.abs(shift)>228)throw new Error('PRICE_INVALID');
 let units=BigInt(match[1]+fraction);
 if(shift>=0)units*=10n**BigInt(shift);else{const divisor=10n**BigInt(-shift);units=(units+divisor/2n)/divisor;}
 if(units<=0n||units>=10n**38n)throw new Error('PRICE_INVALID');
 const digits=units.toString().padStart(19,'0'),tail=digits.slice(-18).replace(/0+$/,'');return digits.slice(0,-18)+(tail?'.'+tail:'');
}
export function providerInteger(value:unknown){if(!(value instanceof ProviderNumber)||!/^(0|[1-9][0-9]{0,9})$/.test(value.text))throw new Error('PRICE_INVALID');const result=Number(value.text);if(result>2147483647)throw new Error('PRICE_INVALID');return result;}
