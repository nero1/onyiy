import {NextResponse,type NextRequest} from 'next/server';
import {randomBytes} from 'node:crypto';
export function proxy(request:NextRequest){
 const nonce=randomBytes(24).toString('base64');const dev=process.env.NODE_ENV==='development';
 const bot=process.env.CAPTCHA_PROVIDER==='turnstile'||!process.env.CAPTCHA_PROVIDER&&process.env.APP_ENV==='testnet';
 const csp=["default-src 'self'",`script-src 'nonce-${nonce}' 'strict-dynamic'${dev?" 'unsafe-eval'":''}`,`style-src 'self' 'nonce-${nonce}'`,"connect-src 'self' https://nile.trongrid.io https://api.shasta.trongrid.io"+(bot?" https://challenges.cloudflare.com":"")+(dev?' ws:':''),"img-src 'self' data: blob:","font-src 'self'",(bot?"frame-src https://challenges.cloudflare.com":"frame-src 'none'"),"worker-src 'self'","object-src 'none'","base-uri 'none'","form-action 'self'","frame-ancestors 'none'",...(process.env.WEB_ORIGIN?.startsWith('https://')?['upgrade-insecure-requests']:[])].join('; ');
 const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',csp);
 const response=NextResponse.next({request:{headers}});response.headers.set('Content-Security-Policy',csp);response.headers.set('Cache-Control','private, no-store');response.headers.set('X-Content-Type-Options','nosniff');response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');if(process.env.WEB_ORIGIN?.startsWith('https://'))response.headers.set('Strict-Transport-Security','max-age=31536000');return response;
}
export const config={matcher:['/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|pwa-shell.js|pwa-shell.css|icon-192.png|icon-512.png).*)']};
