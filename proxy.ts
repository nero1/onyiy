import {publicHelpSlug} from './server/public-reads';
import {NextResponse,type NextRequest} from 'next/server';
import {randomBytes} from 'node:crypto';
export async function proxy(request:NextRequest){
 const locale=request.nextUrl.searchParams.get('locale')==='fr'?'fr':'en';
 const input=request.nextUrl.pathname==='/help'?request.nextUrl.searchParams.get('article'):request.nextUrl.pathname==='/help/article'?request.nextUrl.searchParams.get('slug'):request.nextUrl.pathname.match(/^\/help\/([a-z0-9][a-z0-9-]{0,79})$/)?.[1];
 if(input&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(input)){
  try{const selected=new Headers(),forwarded=request.headers.get('x-vercel-forwarded-for');if(forwarded)selected.set('x-vercel-forwarded-for',forwarded);const publicRequest=new Request(new URL('/api/v1/help',request.url),{headers:selected});const canonical=await publicHelpSlug(locale,input,publicRequest);if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(canonical))throw new Error('CONFIGURATION_INVALID');if(canonical!==input||request.nextUrl.pathname==='/help'||request.nextUrl.pathname==='/help/article')return new NextResponse(null,{status:308,headers:{Location:new URL('/help/'+canonical+(locale==='fr'?'?locale=fr':''),request.url).href,'Cache-Control':'public, max-age=0, must-revalidate'}});}catch(error){if(!(error instanceof Error)||!['NOT_FOUND','FEATURE_DISABLED'].includes(error.message))return new NextResponse(locale==='fr'?'L’aide est temporairement indisponible.':'Help is temporarily unavailable.',{status:error instanceof Error&&error.message==='RATE_LIMITED'?429:503,headers:{'Cache-Control':'no-store','Retry-After':'60','Content-Type':'text/plain; charset=utf-8'}});}
 }

 const nonce=randomBytes(24).toString('base64');const dev=process.env.NODE_ENV==='development';
 const bot=process.env.CAPTCHA_PROVIDER==='turnstile'||!process.env.CAPTCHA_PROVIDER&&process.env.APP_ENV==='testnet';
 const csp=["default-src 'self'",`script-src 'nonce-${nonce}' 'strict-dynamic'${dev?" 'unsafe-eval'":''}`,`style-src 'self' 'nonce-${nonce}'`,"connect-src 'self' https://nile.trongrid.io https://api.shasta.trongrid.io"+(bot?" https://challenges.cloudflare.com":"")+(dev?' ws:':''),"img-src 'self' data: blob:","font-src 'self'",(bot?"frame-src https://challenges.cloudflare.com":"frame-src 'none'"),"worker-src 'self'","object-src 'none'","base-uri 'none'","form-action 'self'","frame-ancestors 'none'",...(process.env.WEB_ORIGIN?.startsWith('https://')?['upgrade-insecure-requests']:[])].join('; ');
 const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('x-public-locale',request.nextUrl.searchParams.get('locale')==='fr'?'fr':'en');headers.set('Content-Security-Policy',csp);
 const response=NextResponse.next({request:{headers}});response.headers.set('Content-Security-Policy',csp);response.headers.set('Cache-Control','private, no-store');response.headers.set('X-Content-Type-Options','nosniff');response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');if(process.env.WEB_ORIGIN?.startsWith('https://'))response.headers.set('Strict-Transport-Security','max-age=31536000');return response;
}
export const config={matcher:['/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|pwa-shell.js|pwa-shell.css|icon-192.png|icon-512.png).*)']};
