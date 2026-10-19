/** A hosting preview is explicitly public and read-only; never payment authority. */
export function isReadOnlyPreview(env:NodeJS.ProcessEnv=process.env){
 const mode=env.PUBLIC_PREVIEW_MODE??'off';
 if(!['off','read_only'].includes(mode))throw new Error('CONFIGURATION_INVALID');
 if(mode==='off')return false;
 if(env.VERCEL_ENV!=='preview')throw new Error('PUBLIC_PREVIEW_REQUIRES_PREVIEW_DEPLOYMENT');
 return true;
}
export function publicPreviewRuntime(env:NodeJS.ProcessEnv){
 if(!isReadOnlyPreview(env))throw new Error('CONFIGURATION_INVALID');
 const appEnv=env.APP_ENV??'simulation',dbProvider=env.DB_PROVIDER??'supabase',databaseUrl=env.DATABASE_URL;
 if(!['simulation','testnet','mainnet'].includes(appEnv)||!['supabase','neon','local','postgres'].includes(dbProvider)||!databaseUrl)throw new Error('CONFIGURATION_INVALID');
 if(env.MAINNET_ENABLED==='true'||env.SIGNER_PROVIDER&&env.SIGNER_PROVIDER!=='disabled')throw new Error('PREVIEW_EXECUTION_DENIED');
 for(const name of ['DATABASE_MIGRATION_URL','AUTH_ACCESS_KEY','AUTH_ACCESS_PREVIOUS_KEY','MFA_ENCRYPTION_KEY','SIMULATION_TOOL_AUTH_KEY','FINANCIAL_WORKER_AUTH_KEY','PRICE_FEED_AUTH_KEY','PRICE_FEED_KEY_PACKAGE_JSON','PRICE_FEED_DECRYPTION_SECRET','COINMARKETCAP_API_KEY','SIGNER_DECRYPTION_SECRET','ARCHIVE_ENCRYPTION_KEY','GOOGLE_CLIENT_SECRET','SIGNER_DATABASE_URL','SIGNER_KEY_FILE','SIGNER_KEY_FILES_JSON','SIGNER_KEY_PACKAGE_JSON','SIGNED_PAYLOAD_ENCRYPTION_KEY','ALERT_WEBHOOK_KEY','DATA_EXPORT_KEY','EXPORT_ENCRYPTION_KEY','SCHEDULER_HMAC_KEY','SCHEDULER_HMAC_PREVIOUS_KEY','CAPTCHA_SECRET_KEY','UPSTASH_REDIS_REST_TOKEN','REDIS_URL','SUPABASE_SERVICE_ROLE_KEY'])if(env[name])throw new Error('PREVIEW_PRIVATE_CREDENTIAL_DENIED');
 return {appEnv,dbProvider,databaseUrl,cacheProvider:'postgres_memory',providers:{AUTH_PROVIDER:'disabled',PAYMENT_PROVIDER:'disabled',WALLET_PROVIDER:'disabled',SIGNER_PROVIDER:'disabled',CAPTCHA_PROVIDER:'none',REALTIME_PROVIDER:'none',PRICE_PROVIDER:'disabled',ALERT_PROVIDER:'none',DEPLOYMENT_PROFILE:'public_preview'}};
}
