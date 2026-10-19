import crypto from 'node:crypto';

/** Shared wire format for the server, isolated signer and dependency-free tick.
 * Environment is authenticated; bodyHash covers the exact original bytes. */
export function financialWorkerSignature(scope,key){
 if(!['testnet','mainnet'].includes(scope.environment)||scope.purpose!=='financial'||scope.method!=='POST'||scope.path!=='/api/v1/internal/financial'||!/^\d{10}$/.test(scope.timestamp)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scope.nonce)||!/^[0-9a-f]{64}$/.test(scope.bodyHash)||!(key instanceof Uint8Array)||key.byteLength!==32)throw new Error('WORKER_ENVELOPE_INVALID');
 return crypto.createHmac('sha256',key).update(['v1',scope.environment,scope.purpose,scope.method,scope.path,scope.timestamp,scope.nonce,scope.bodyHash].join('\n')).digest('base64url');
}

/** Price publication has a separate key, purpose and endpoint. */
export function priceFeedSignature(scope,key){
 if(!['testnet','mainnet'].includes(scope.environment)||scope.purpose!=='prices'||scope.method!=='POST'||scope.path!=='/api/v1/internal/prices'||!/^\d{10}$/.test(scope.timestamp)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scope.nonce)||!/^[0-9a-f]{64}$/.test(scope.bodyHash)||!(key instanceof Uint8Array)||key.byteLength!==32)throw new Error('WORKER_ENVELOPE_INVALID');
 return crypto.createHmac('sha256',key).update(['v1',scope.environment,scope.purpose,scope.method,scope.path,scope.timestamp,scope.nonce,scope.bodyHash].join('\n')).digest('base64url');
}
