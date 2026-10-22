import type {SessionResult} from './auth-client';
import {setClientSession} from './api-client';
import {activateUserScope,activeSessionGeneration,clearActiveUserScope} from './storage';
/** Accept one identity atomically before a portal exposes its private state. */
export function acceptSessionScope(value:SessionResult,previous:SessionResult|null){
 const changed=value.user?activeSessionGeneration(value.user.username)!==value.generation:!!previous?.user;
 setClientSession(value.user?.username??'',value.generation??'');
 if(value.user&&value.generation)activateUserScope(value.user.username,value.generation);
 else if(previous?.user)clearActiveUserScope(previous.user.username,previous.generation);
 if(changed&&typeof BroadcastChannel==='function'){
  const channel=new BroadcastChannel('gw-session-scope-v1');
  try{channel.postMessage({type:'GW_SCOPE',owner:value.user?.username??'',generation:value.generation??''});}finally{channel.close();}
 }
}
