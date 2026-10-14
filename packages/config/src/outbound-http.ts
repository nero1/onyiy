// Server-only outbound transport. DNS validation and the actual socket use the
// same pinned address; URL checks alone cannot prevent DNS rebinding.
import dns from 'node:dns/promises';
import net from 'node:net';
import https from 'node:https';
import http from 'node:http';
let resolving = 0, active = 0;

export function publicDestination(address: string) {
  const family = net.isIP(address);
  if (family === 4) {
    const [a,b,c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113) || (a === 192 && b === 88 && c === 99));
  }
  if (family !== 6) return false;
  const parts=address.split(':');
  const first = parseInt(parts[0],16), second=parseInt(parts[1]||'0',16);
  // Accept global unicast only; reject mapped IPv4, translation/tunnel and
  // reserved documentation/protocol prefixes rather than follow a relay.
  return first >= 0x2000 && first <= 0x3fff && first !== 0x2002 &&
    !(first===0x2001&&(second<0x200||second===0xdb8)) && first!==0x3fff;
}
function approvedHost(host: string) {
  const configured = (process.env.OUTBOUND_ALLOWED_HOSTS ?? '').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
  if (configured.length > 100 || configured.some(v=>!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(v)))
    throw new Error('OUTBOUND_CONFIGURATION_INVALID');
  return configured.includes(host);
}
export async function pinnedDestination(url: URL, signal: AbortSignal, fixture = false) {
  signal.throwIfAborted();
  const host = url.hostname.replace(/^\[|\]$/g,'').toLowerCase();
  const isolated = fixture && (process.env.APP_ENV ?? 'simulation') === 'simulation' && process.env.VERCEL !== '1' && ['127.0.0.1','localhost','::1'].includes(host);
  if (url.username || url.password || url.hash || (!['https:','rediss:'].includes(url.protocol) && !(isolated && url.protocol === 'http:')) || (!isolated && !approvedHost(host)))
    throw new Error('OUTBOUND_DESTINATION_REJECTED');
  if(resolving>=32)throw new Error('OUTBOUND_CAPACITY_EXCEEDED');
  let cancel: (()=>void) | undefined;
  const lookup=()=>{resolving++;return dns.lookup(host,{all:true,verbatim:true}).finally(()=>{resolving--})};
  try {
    const addresses = net.isIP(host) ? [{address:host,family:net.isIP(host)}] : await Promise.race([
      lookup(),
      new Promise<never>((_resolve,reject)=>{
        cancel=()=>reject(new Error('OUTBOUND_UNAVAILABLE'));
        signal.addEventListener('abort',cancel,{once:true});
        if(signal.aborted)cancel();
      }),
    ]);
    signal.throwIfAborted();
    if (!addresses.length || addresses.length > 16 || addresses.some(row=>isolated ? !['127.0.0.1','::1'].includes(row.address) : !publicDestination(row.address)))
      throw new Error('OUTBOUND_DESTINATION_REJECTED');
    const chosen=addresses.find(row=>row.family===4)??addresses[0];
    return { address: chosen.address, family: chosen.family, hostname: host };
  } finally { if(cancel)signal.removeEventListener('abort',cancel); }
}
export async function pinnedPost(url: URL, input: { headers: Record<string,string>; body: string; signal: AbortSignal; maxBytes: number; fixture?: boolean }) {
  if (!Number.isSafeInteger(input.maxBytes) || input.maxBytes < 1 || input.maxBytes > 2*1024*1024 || Buffer.byteLength(input.body)>2*1024*1024)
    throw new Error('OUTBOUND_INPUT_INVALID');
  if(active>=32)throw new Error('OUTBOUND_CAPACITY_EXCEEDED');
  const pinned = await pinnedDestination(url,input.signal,input.fixture);
  if(active>=32)throw new Error('OUTBOUND_CAPACITY_EXCEEDED');
  active++;
  try { return await new Promise<Response>((resolve,reject)=>{
    const transport = url.protocol === 'https:' ? https : http;
    const options: https.RequestOptions & {autoSelectFamily:boolean} = {
      method:'POST',headers:input.headers,signal:input.signal,agent:false,
      servername:pinned.hostname,rejectUnauthorized:true,autoSelectFamily:false,
      // Bypass a second lookup: the socket cannot resolve to a new/private IP.
      lookup:(_hostname,_options,callback)=>callback(null,pinned.address,pinned.family as 4|6),
    };
    const request = transport.request(url,options,response=>{
      const status=response.statusCode??500;
      if(status>=300&&status<400){response.destroy();reject(new Error('OUTBOUND_DESTINATION_REJECTED'));return}
      let size=0;const chunks:Buffer[]=[];
      response.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>input.maxBytes){response.destroy();reject(new Error('OUTBOUND_RESPONSE_LIMIT'))}else chunks.push(chunk)});
      response.on('error',()=>reject(new Error('OUTBOUND_UNAVAILABLE')));
      response.on('end',()=>{
        const headers=new Headers();for(const [key,value] of Object.entries(response.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);
        try { resolve(new Response([204,205].includes(status)?null:new Uint8Array(Buffer.concat(chunks)),{status,headers})); } catch {reject(new Error('OUTBOUND_RESPONSE_INVALID'))}
      });
    });
    request.on('upgrade',(_response,socket)=>{socket.destroy();reject(new Error('OUTBOUND_RESPONSE_INVALID'))});
    request.on('error',()=>reject(new Error('OUTBOUND_UNAVAILABLE')));
    request.end(input.body);
  }); } finally {active--}
}
