/** Shared bounded UTF-8 reader. Form editor content fits inside64 KiB; native
 * unsigned transactions are responses rather than arbitrary uploaded payloads. */
type BodySource=Pick<Request,'headers'|'body'> & {signal?:AbortSignal};
export async function boundedText(
  request: BodySource,
  maximum = 65536,
  timeoutMs = 5000,
): Promise<string> {
  if (!Number.isSafeInteger(maximum) || maximum < 1 || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new Error("INVALID_INPUT");
  const declared = request.headers.get("content-length");
  if (
    declared &&
    (!/^[0-9]+$/.test(declared) || BigInt(declared) > BigInt(maximum))
  )
    throw new Error("INVALID_INPUT");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const cancel = () => { stopped = true; void reader.cancel().catch(() => {}); };
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { cancel(); reject(new Error("REQUEST_TIMEOUT")); }, timeoutMs);
  });
  request.signal?.addEventListener("abort", cancel, { once: true });
  try {
    if (request.signal?.aborted) throw new Error("REQUEST_TIMEOUT");
    while (true) {
      const part = await Promise.race([reader.read(), deadline]);
      if (stopped) throw new Error("REQUEST_TIMEOUT");
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maximum) {
        cancel();
        throw new Error("INVALID_INPUT");
      }
      chunks.push(part.value);
    }
  } finally {
    clearTimeout(timer);
    request.signal?.removeEventListener("abort", cancel);
    // A stream may never settle its cancellation hook. Closing the reader is
    // synchronous; cleanup must not extend the request deadline.
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    throw new Error("INVALID_INPUT");
  }
}

export async function boundedJson(request:Request,maximum=65536,timeoutMs=5000):Promise<unknown>{
 const text=await boundedText(request,maximum,timeoutMs);
 try{return JSON.parse(text);}catch{throw new Error('INVALID_INPUT');}
}
