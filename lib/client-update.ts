import {APP_WIRE_VERSION,APP_MINIMUM_SERVER_VERSION,responsePeerCompatible} from '@gifters/domain';
let required=false;
export const updateEvent='gw:client-update';
export function clientUpdateRequired(){return required;}
export function requireClientUpdate(){if(required)return;required=true;if(typeof window!=='undefined')window.dispatchEvent(new Event(updateEvent));}
export function clientVersionHeaders(headers:Headers){headers.set('X-GW-Client-Protocol',String(APP_WIRE_VERSION));headers.set('X-GW-Min-Server-Protocol',String(APP_MINIMUM_SERVER_VERSION));}
export function observeServerVersion(headers:Headers){
 const compatible=responsePeerCompatible(headers.get('x-gw-api-protocol'),headers.get('x-gw-min-client-protocol'));
 if(!compatible)requireClientUpdate();return compatible;
}
