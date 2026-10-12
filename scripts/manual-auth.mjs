export function installSimulationToolAuth(){
 const key=process.env.SIMULATION_TOOL_AUTH_KEY,base=process.env.APP_BASE_URL;
 if(!key||!/^[A-Za-z0-9_-]{43}$/.test(key)||!base)throw new Error('Named simulation scenarios require APP_BASE_URL and a separately provisioned SIMULATION_TOOL_AUTH_KEY');
 const origin=new URL(base).origin,original=globalThis.fetch;
 globalThis.fetch=(input,init={})=>{const url=new URL(input instanceof Request?input.url:String(input));const headers=new Headers(init.headers??(input instanceof Request?input.headers:undefined));if(url.origin===origin&&headers.has('x-sim-user'))headers.set('x-simulation-tool-key',key);return original(input,{...init,headers});};
}
