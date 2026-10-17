import { AsyncLocalStorage } from 'node:async_hooks';
import { pinnedPost } from '../../config/src/outbound-http';
import { MemoryCache } from "@gifters/cache";
import type { RpcOptions } from "./types";
type RpcBudget={deadline:number;remaining:number};
const budgets=new AsyncLocalStorage<RpcBudget>();
const cancellations=new AsyncLocalStorage<AbortSignal>();
export function withRpcCancellation<T>(signal:AbortSignal,fn:()=>Promise<T>){const parent=cancellations.getStore();return cancellations.run(parent?AbortSignal.any([parent,signal]):signal,fn);}
export function withRpcBudget<T>(fn:()=>Promise<T>,milliseconds=18000,requests=24){
  if(!Number.isSafeInteger(milliseconds)||milliseconds<100||milliseconds>20000||!Number.isSafeInteger(requests)||requests<1||requests>32)throw new Error('RPC_CONFIGURATION_INVALID');
  const inherited=budgets.getStore();
  if(inherited)return fn();
  return budgets.run({deadline:Date.now()+milliseconds,remaining:requests},fn);
}
const cache = new MemoryCache({ maxEntries: 100, maxBytes: 5 * 1024 * 1024 });
type Lane = {
  next: number;
  serial: Promise<void>;
  pending: number;
};
const lanes = new Map<string, Lane>();
const flights = new Map<string, Promise<unknown>>();
const failures = new Map<string, { count: number; until: number }>();
const observationMethods=new Set(['eth_chainId','eth_blockNumber','eth_getBlockByNumber','eth_getBalance','eth_getCode','eth_call','eth_getLogs','eth_getTransactionByHash','eth_getTransactionReceipt','eth_getTransactionCount','eth_estimateGas','eth_gasPrice','getGenesisHash','getSlot','getBlock','getBlocks','getBlockHeight','getBalance','getAccountInfo','getTokenAccountBalance','getTransaction','getSignatureStatuses','getFeeForMessage','getLatestBlockhash','getMinimumBalanceForRentExemption']);
const preparationPaths=new Set(['wallet/createtransaction','wallet/triggersmartcontract']);
const observationPaths=new Set(['wallet/getaccount','wallet/getblockbynum','wallet/getchainparameters','wallet/getnowblock','wallet/gettransactionbyid','wallet/gettransactioninfobyid','wallet/triggerconstantcontract','wallet/estimateenergy','walletsolidity/getaccount','walletsolidity/getblockbynum','walletsolidity/getnowblock','walletsolidity/gettransactioninfobyid','walletsolidity/triggerconstantcontract']);
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
  readonly #observationOnly:boolean;
  readonly #preparationOnly:boolean;
  get observationOnly(){return this.#observationOnly}
  get preparationOnly(){return this.#preparationOnly}
  get nonSendingOnly(){return this.#observationOnly||this.#preparationOnly}
  assertPreparation(){if(this.#observationOnly)throw new Error('OBSERVATION_ONLY');return this.#preparationOnly;}
  assertBroadcast(){if(this.#observationOnly)throw new Error('OBSERVATION_ONLY');if(this.#preparationOnly)throw new Error('PREPARATION_ONLY');}
  constructor(readonly options: RpcOptions) {
    this.#observationOnly=options.observationOnly===true;
    this.#preparationOnly=options.preparationOnly===true;
    if(options.preparationOnly!==undefined&&typeof options.preparationOnly!=='boolean'||this.#observationOnly&&this.#preparationOnly)throw new Error('RPC_CONFIGURATION_INVALID');
    if(options.observationOnly!==undefined&&typeof options.observationOnly!=='boolean')throw new Error('RPC_CONFIGURATION_INVALID');
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
  private async throttle(endpoint: string, signal: AbortSignal) {
    const lane = laneFor(endpoint);
    if (lane.pending >= 100) throw new Error("RPC_CAPACITY_EXCEEDED");
    lane.pending++;
    const task = lane.serial.then(async () => {
      signal.throwIfAborted();
      const pause = Math.max(0, lane.next - Date.now());
      if (pause) await new Promise<void>((resolve, reject) => {
        const cancel = () => { clearTimeout(timer); reject(new Error("RPC_UNAVAILABLE")); };
        const timer = setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, pause);
        signal.addEventListener("abort", cancel, { once: true });
        if (signal.aborted) cancel();
      });
      signal.throwIfAborted();
      lane.next = Date.now() + Math.ceil(1000 / this.options.requestsPerSecond);
    });
    lane.serial = task.catch(() => {});
    // Race admission as well as the head-of-lane delay. Expired queued work
    // remains inert when its turn arrives and never starts a provider request.
    let cancel: (() => void) | undefined;
    try {
      await Promise.race([task, new Promise<never>((_resolve, reject) => {
        cancel = () => reject(new Error("RPC_UNAVAILABLE"));
        signal.addEventListener("abort", cancel, { once: true });
        if (signal.aborted) cancel();
      })]);
    } finally {
      if (cancel) signal.removeEventListener("abort", cancel);
      // Capacity counts queued entries until they have actually left the lane.
      void task.finally(() => { lane.pending--; }).catch(() => {});
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
    let observationBody:string|undefined;
    if(this.#observationOnly||this.#preparationOnly){
      const denied=this.#preparationOnly?'PREPARATION_ONLY':'OBSERVATION_ONLY';
      let wire:unknown;
      try{observationBody=JSON.stringify(body);if(!observationBody||Buffer.byteLength(observationBody)>2*1024*1024)throw new Error();wire=JSON.parse(observationBody)}catch{throw new Error(denied)}
      const method=wire&&typeof wire==='object'&&!Array.isArray(wire)?(wire as {method?:unknown}).method:undefined;
      if(!((path===''||path==='jsonrpc')&&jsonRpc&&typeof method==='string'&&observationMethods.has(method))&&!(!jsonRpc&&(observationPaths.has(path)||this.#preparationOnly&&preparationPaths.has(path))))throw new Error(denied);
    }
    const cancellation=cancellations.getStore();if(cancellation?.aborted)throw new Error('RPC_BUDGET_EXCEEDED');
    const budget=budgets.getStore();
    if(budget&&(budget.remaining--<=0||budget.deadline<=Date.now()))throw new Error('RPC_BUDGET_EXCEEDED');
    const timeout=Math.min(this.options.timeoutMs,budget?Math.max(1,budget.deadline-Date.now()):this.options.timeoutMs);
    const root = side === 0 ? this.options.primary : this.options.secondary;
    const target = path
      ? new URL(path, root.endsWith("/") ? root : root + "/").toString()
      : root;
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), timeout);
    const cancel=()=>controller.abort();cancellation?.addEventListener('abort',cancel,{once:true});if(cancellation?.aborted)cancel();
    let dispatched = false;
    try {
      const circuit = failures.get(root);
      if (circuit && circuit.until > Date.now()) throw new Error("RPC_UNAVAILABLE");
      await this.throttle(root, controller.signal);
      dispatched = true;
      const response = await pinnedPost(new URL(target), {
        headers: { "Content-Type": "application/json" },
        body: observationBody??JSON.stringify(body),
        signal: controller.signal, maxBytes: 2*1024*1024, fixture: this.options.fixture,
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
      failures.delete(root);
      return jsonRpc ? value.result : value;
    } catch {
      // No automatic replay of broadcasts or signed operations. A bounded
      // cooldown also caps admission pressure on an unavailable provider.
      if (dispatched&&!cancellation?.aborted) {
      if (failures.size >= 100 && !failures.has(root)) failures.delete(failures.keys().next().value!);
      const old = failures.get(root), count = Math.min(6, (old?.count ?? 0) + 1);
      failures.set(root, { count, until: Date.now() + Math.min(5000, 100 * 2 ** count) + Math.floor(Math.random() * 100) });
      }
      throw new Error("RPC_UNAVAILABLE");
    } finally {
      clearTimeout(timer);cancellation?.removeEventListener('abort',cancel);
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
    // Financial confirmation explicitly asks for fresh evidence and bypasses
    // both cached values and display-read single-flight.
    if (fresh) return load();
    const existing = flights.get(scoped);
    if (existing) return existing as Promise<T>;
    if (flights.size >= 100) throw new Error("RPC_CAPACITY_EXCEEDED");
    const pending = (async () => {
      const value = await load();
      await cache.set(scoped, value, { ttlSeconds: seconds });
      return value;
    })();
    flights.set(scoped, pending);
    try { return await pending; }
    finally { if (flights.get(scoped) === pending) flights.delete(scoped); }
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
