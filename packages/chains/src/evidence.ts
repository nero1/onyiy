import type { TransferEvidence } from "./types";
/** A disagreement is unresolved evidence, including fee and height differences. */
export function reconcileEvidence(
  results: PromiseSettledResult<TransferEvidence>[],
  hash: string,
  index: number,
): TransferEvidence {
  const valid = results
    .filter(
      (v): v is PromiseFulfilledResult<TransferEvidence> =>
        v.status === "fulfilled",
    )
    .map((v) => v.value);
  const conflict = results.find(
    (v) =>
      v.status === "rejected" &&
      (!(v.reason instanceof Error) || v.reason.message !== "RPC_UNAVAILABLE"),
  );
  if (!valid.length) {
    if (conflict?.status === "rejected") throw conflict.reason;
    throw new Error("RPC_UNAVAILABLE");
  }
  const digest = (v: TransferEvidence) =>
    JSON.stringify({
      ...v,
      observedAt: undefined,
      height: v.height?.toString(),
      amount: v.amount?.toString(),
      actualNativeFee: v.actualNativeFee?.toString(),
    });
  if (
    conflict ||
    valid.some((v) => v.contradiction) ||
    (valid.length === 2 && digest(valid[0]) !== digest(valid[1]))
  )
    return {
      state: "pending",
      hash,
      index,
      observedAt: new Date().toISOString(),
      contradiction: true,
    };
  return valid[0];
}
