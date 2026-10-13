import { base58 } from "@scure/base";
import type { Chain } from "./types";
export function canonicalTransactionHash(chain: Chain, value: string) {
  if (chain === "eth" || chain === "bnb") {
    if (!/^0x[0-9a-f]{64}$/i.test(value)) throw new Error("INVALID_INPUT");
    return value.toLowerCase();
  }
  if (chain === "tron") {
    if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error("INVALID_INPUT");
    return value.toLowerCase();
  }
  try {
    const bytes = base58.decode(value);
    if (bytes.length !== 64 || base58.encode(bytes) !== value)
      throw new Error();
    return value;
  } catch {
    throw new Error("INVALID_INPUT");
  }
}
