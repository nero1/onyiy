import { MemoryCache } from "@gifters/cache";
import type { RpcOptions } from "./types";
const cache = new MemoryCache({ maxEntries: 100, maxBytes: 5 * 1024 * 1024 });
type Lane = {
  next: number;
  serial: Promise<void>;
  pending: number;
};
const lanes = new Map<string, Lane>();
function laneFor(endpoint: string) {
  let lane = lanes.get(endpoint);
  if (lane) return lane;
  for (const [key, value] of lanes)
    if (value.pending === 0 && value.next < Date.now()) lanes.delete(key);
  if (lanes.size >= 100) throw new Error("RPC_CAPACITY_EXCEEDED");
  lane = { next: 0, serial: Promise.resolve(), pending: 0 };
  lanes.set(endpoint, lane);
  return lane;
}
export class DualRpc {
  private counter = 0;
  constructor(readonly options: RpcOptions) {
    if (
      !Number.isInteger(options.requestsPerSecond) ||
      options.requestsPerSecond < 1 ||
      options.requestsPerSecond > 50 ||
      options.timeoutMs < 100 ||
      options.timeoutMs > 10000
    )
      throw new Error("RPC_CONFIGURATION_INVALID");
    const urls = [options.primary, options.secondary].map(
      (value) => new URL(value),
    );
    for (const u of urls)
      if (
        u.username ||
        u.password ||
        (u.protocol !== "https:" &&
          !(
            options.fixture &&
            u.protocol === "http:" &&
            ["127.0.0.1", "localhost"].includes(u.hostname)
          ))
      )
        throw new Error("RPC_CONFIGURATION_INVALID");
    if (
      options.primary === options.secondary ||
      (!options.fixture && urls[0].hostname === urls[1].hostname)
    )
      throw new Error("RPC_ENDPOINTS_NOT_INDEPENDENT");
  }
  private async throttle(endpoint: string) {
    const lane = laneFor(endpoint);
    if (lane.pending >= 100) throw new Error("RPC_CAPACITY_EXCEEDED");
    lane.pending++;
    const task = lane.serial.then(async () => {
      const pause = Math.max(0, lane.next - Date.now());
      if (pause) await new Promise((r) => setTimeout(r, pause));
      lane.next = Date.now() + Math.ceil(1000 / this.options.requestsPerSecond);
    });
    lane.serial = task.catch(() => {});
    try {
      await task;
    } finally {
      lane.pending--;
    }
  }
  async request(side: 0 | 1, method: string, params: unknown[]) {
    return this.post(
      side,
      "",
      { jsonrpc: "2.0", id: ++this.counter, method, params },
      true,
    );
  }
  async post(
    side: 0 | 1,
    path: string,
    body: unknown,
    jsonRpc = false,
  ): Promise<any> {
    const root = side === 0 ? this.options.primary : this.options.secondary;
    await this.throttle(root);
    const target = path
      ? new URL(path, root.endsWith("/") ? root : root + "/").toString()
      : root;
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(target, {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) throw Error();
      const reader = response.body?.getReader();
      if (!reader) throw Error();
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > 2 * 1024 * 1024) {
          await reader.cancel();
          throw Error();
        }
        chunks.push(next.value);
      }
      const text = Buffer.concat(chunks).toString("utf8");
      const value = JSON.parse(text, (_key, v, ...context: unknown[]) => {
        if (
          typeof v === "number" &&
          Number.isInteger(v) &&
          !Number.isSafeInteger(v)
        ) {
          const source = (
            context[0] as
              | {
                  source?: string;
                }
              | undefined
          )?.source;
          if (!source || !/^(0|[1-9][0-9]{0,77})$/.test(source)) throw Error();
          return source;
        }
        return v;
      });
      if (jsonRpc && (value.error || !Object.hasOwn(value, "result")))
        throw Error();
      return jsonRpc ? value.result : value;
    } catch {
      throw new Error("RPC_UNAVAILABLE");
    } finally {
      clearTimeout(timer);
    }
  }
  async pair(method: string, params: unknown[]) {
    const values = await Promise.allSettled([
      this.request(0, method, params),
      this.request(1, method, params),
    ]);
    if (values.every((v) => v.status === "rejected"))
      throw new Error("RPC_UNAVAILABLE");
    return values.map((v) => (v.status === "fulfilled" ? v.value : null)) as [
      any,
      any,
    ];
  }
  async cached<T>(
    key: string,
    seconds: number,
    load: () => Promise<T>,
    fresh = false,
  ): Promise<T> {
    const scoped =
      this.options.primary + "|" + this.options.secondary + "|" + key;
    if (!fresh) {
      const value = await cache.get<T>(scoped);
      if (value !== null && value !== undefined) return value;
    }
    const value = await load();
    await cache.set(scoped, value, { ttlSeconds: seconds });
    return value;
  }
}
export function quantity(value: unknown) {
  if (typeof value !== "string" || !/^0x[0-9a-f]{1,64}$/i.test(value))
    throw new Error("RPC_EVIDENCE_INVALID");
  return BigInt(value);
}
export function integer(value: unknown) {
  if (typeof value === "string" && /^(0|[1-9][0-9]{0,77})$/.test(value))
    return BigInt(value);
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
    return BigInt(value);
  throw new Error("RPC_EVIDENCE_INVALID");
}
