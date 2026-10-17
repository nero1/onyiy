export type AuthUser={id:string;username:string;role:string;status:string;locale:string;time_zone?:string;consent_version?:string|null;age_confirmed?:boolean;age_minimum_accepted?:number|null;email?:string|null};
export type SessionResult={environment?:'simulation'|'testnet';user:AuthUser|null;generation?:string;requires_mfa?:boolean;provider?:string;can_refresh?:boolean;recovery_codes?:string[]};
import {api,mutation} from './api-client';
export async function loadSession():Promise<SessionResult>{
 const value=await api<SessionResult>('/auth/session','');
 if(!value.user&&!value.requires_mfa&&value.can_refresh){try{return await mutation<SessionResult>('/auth/refresh','',{})}catch{return {...value,can_refresh:false}}}
 return value;
}
