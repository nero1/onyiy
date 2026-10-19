import {pinnedGet} from '../../packages/config/src/outbound-http';
import {ProviderNumber,providerInteger,providerJson,providerPrice} from './provider-json';
export type MarketQuote={id:number;usd:string;observedAt:string;source:string};
export type PriceProvider={quotes(ids:readonly number[],signal?:AbortSignal):Promise<Map<number,MarketQuote>>};
type Transport=typeof pinnedGet;
export class PriceProviderFailure extends Error{constructor(readonly retryAfterSeconds=60){super('PROVIDER_UNAVAILABLE')}}
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value)||value instanceof ProviderNumber)throw new Error('PRICE_INVALID');return value as Record<string,unknown>;}
function observed(value:unknown,now:number){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value))throw new Error('PRICE_INVALID');const time=Date.parse(value);if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,19)!==value.slice(0,19))throw new Error('PRICE_INVALID');if(time>now||now-time>=300000)throw new Error('PRICE_STALE');return new Date(time).toISOString();}
export function decodeCoinMarketCap(text:string,requested:readonly number[],now=Date.now()){
 if(!Number.isFinite(now)||requested.length<1||requested.length>16||new Set(requested).size!==requested.length||requested.some(id=>!Number.isSafeInteger(id)||id<1||id>2147483647))throw new Error('PRICE_INVALID');
 const parsed=providerJson(text);let rows:unknown;
 if(Array.isArray(parsed))rows=parsed;else{const envelope=object(parsed),status=object(envelope.status);if(providerInteger(status.error_code)!==0)throw new PriceProviderFailure();observed(status.timestamp,now);rows=envelope.data;}
 if(!Array.isArray(rows)||rows.length!==requested.length)throw new Error('PRICE_INVALID');
 const result=new Map<number,MarketQuote>();
 for(const item of rows){const row=object(item),id=providerInteger(row.id);if(!requested.includes(id)||result.has(id)||providerInteger(row.is_active)!==1||providerInteger(row.is_fiat)!==0||typeof row.slug!=='string'||!/^[a-z0-9][a-z0-9-]{0,99}$/.test(row.slug)||!Array.isArray(row.quote)||row.quote.length!==1)throw new Error('PRICE_INVALID');const quote=object(row.quote[0]);if(providerInteger(quote.id)!==2781||quote.symbol!=='USD')throw new Error('PRICE_INVALID');result.set(id,{id,usd:providerPrice(quote.price),observedAt:observed(quote.last_updated,now),source:'https://coinmarketcap.com/currencies/'+row.slug+'/'});}
 return result;
}
/** Only this selected backend adapter knows the provider URL/header. */
export class CoinMarketCapProvider implements PriceProvider{
 constructor(private readonly apiKey?:string,private readonly transport:Transport=pinnedGet){}
 async quotes(ids:readonly number[],signal?:AbortSignal){
  const requested=[...new Set(ids)].sort((a,b)=>a-b);if(requested.length<1||requested.length>16||requested.some(id=>!Number.isSafeInteger(id)||id<1||id>2147483647))throw new Error('CONFIGURATION_INVALID');
  if(this.apiKey&&!/^[A-Za-z0-9_-]{8,200}$/.test(this.apiKey))throw new Error('CONFIGURATION_INVALID');
  const url=new URL('https://pro-api.coinmarketcap.com'+(this.apiKey?'':'/public-api')+'/v3/cryptocurrency/quotes/latest');url.searchParams.set('id',requested.join(','));url.searchParams.set('convert','USD');
  const headers:Record<string,string>={Accept:'application/json','Accept-Encoding':'identity'};if(this.apiKey)headers['X-CMC_PRO_API_KEY']=this.apiKey;
  let response:Response;try{response=await this.transport(url,{headers,signal:AbortSignal.any([AbortSignal.timeout(5000),...(signal?[signal]:[])]),maxBytes:524288})}catch{throw new PriceProviderFailure()}
  if(!response.ok){const retry=response.headers.get('retry-after');let seconds=60;if(retry&&/^\d{1,8}$/.test(retry))seconds=Math.min(86400,Math.max(1,Number(retry)));else if(retry&&Number.isFinite(Date.parse(retry)))seconds=Math.min(86400,Math.max(1,Math.ceil((Date.parse(retry)-Date.now())/1000)));await response.body?.cancel();throw new PriceProviderFailure(seconds);}
  if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??'')||!['','identity'].includes(response.headers.get('content-encoding')??'')){await response.body?.cancel();throw new Error('PRICE_INVALID')}
  const body=await response.text();return decodeCoinMarketCap(body,requested);
 }
}
