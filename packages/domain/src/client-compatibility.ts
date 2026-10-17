/** Keep legacy clients supported during the documented deprecation period.
 * Current clients require a versioned API. Ordinary deployments/additive
 * changes do not raise either minimum; breaking changes require API versioning. */
export const APP_WIRE_VERSION=1;
export const APP_MINIMUM_CLIENT_VERSION=0;
export const APP_MINIMUM_SERVER_VERSION=1;
export const appCompatibility={version:APP_WIRE_VERSION,minimum_peer_version:APP_MINIMUM_CLIENT_VERSION} as const;
export function wireVersion(value:string|null){return value!==null&&/^(0|[1-9][0-9]{0,3})$/.test(value)&&Number(value)<=1000?Number(value):null;}
export function compatiblePeers(ownVersion:number,ownMinimum:number,peerVersion:number,peerMinimum:number){return ownVersion>=peerMinimum&&peerVersion>=ownMinimum;}
function peerCompatible(minimumOwn:number,version:string|null,minimum:string|null){
 if(version===null&&minimum===null)return compatiblePeers(APP_WIRE_VERSION,minimumOwn,0,0);
 const peer=wireVersion(version),needs=wireVersion(minimum);
 return peer!==null&&needs!==null&&peer>=needs&&compatiblePeers(APP_WIRE_VERSION,minimumOwn,peer,needs);
}
export function requestPeerCompatible(version:string|null,minimum:string|null){return peerCompatible(APP_MINIMUM_CLIENT_VERSION,version,minimum);}
export function responsePeerCompatible(version:string|null,minimum:string|null){return peerCompatible(APP_MINIMUM_SERVER_VERSION,version,minimum);}
