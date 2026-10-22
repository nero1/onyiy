/** Bound bytes while reading; cancelling prevents oversized bodies accumulating. */
export async function boundedResponseText(response,maximum){
 if(!Number.isSafeInteger(maximum)||maximum<1||maximum>10485760)throw Error('RESPONSE_LIMIT_INVALID');
 const reader=response.body?.getReader();if(!reader)return '';
 const chunks=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maximum)throw Error('RESPONSE_LIMIT_EXCEEDED');chunks.push(value);}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return new TextDecoder().decode(bytes);
}
