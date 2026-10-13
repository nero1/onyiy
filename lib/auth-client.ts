export type AuthUser={id:string;username:string;role:string;status:string;locale:string;consent_version?:string|null;age_confirmed?:boolean;email?:string|null};
export type SessionResult={environment?:'simulation'|'testnet';user:AuthUser|null;generation?:string;requires_mfa?:boolean;provider?:string;can_refresh?:boolean;recovery_codes?:string[]};
