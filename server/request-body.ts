/** Shared bounded JSON reader. Form editor content fits inside64 KiB; native
 * unsigned transactions are responses rather than arbitrary uploaded payloads. */
export async function boundedJson(
  request: Request,
  maximum = 65536,
): Promise<unknown> {
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
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maximum) {
        await reader.cancel();
        throw new Error("INVALID_INPUT");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
  } catch {
    throw new Error("INVALID_INPUT");
  }
}
