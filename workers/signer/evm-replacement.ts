import { Transaction, getAddress, Interface } from "ethers";
import type {
  AssetRegistry,
  ChainAdapter,
  SignedTransfer,
  PreparedTransfer,
} from "../../packages/chains/src/types";
const abi = new Interface(["function transfer(address,uint256)"]);
/** Same nonce and exact recipient/principal; a fee bump never authorizes a
 * competing entitlement. Caller persists the encrypted lineage before send. */
export async function prepareEvmReplacement(
  chain: ChainAdapter,
  asset: AssetRegistry,
  original: SignedTransfer,
  input: {
    sender: string;
    destination: string;
    amount: bigint;
    approvedNetworkFee: bigint;
    variancePercent: number;
    signedAtHeight: bigint;
    stuckBlocks: number;
  },
): Promise<PreparedTransfer | undefined> {
  if (
    !["eth", "bnb"].includes(asset.chain) ||
    !Number.isInteger(input.variancePercent) ||
    input.variancePercent < 0 ||
    input.variancePercent > 25 ||
    input.stuckBlocks < 1
  )
    throw new Error("SIGNED_INTENT_INVALID");
  const old = Transaction.from(original.bytes);
  if (
    !old.signature ||
    old.hash?.toLowerCase() !== original.hash.toLowerCase() ||
    old.chainId !== BigInt(asset.network) ||
    BigInt(old.nonce) !== original.nonce ||
    !old.from ||
    getAddress(old.from) !== getAddress(input.sender) ||
    !old.to ||
    old.type !== 0 ||
    old.gasPrice === null
  )
    throw new Error("SIGNED_INTENT_INVALID");
  const to = asset.kind === "native" ? input.destination : asset.contract!,
    data =
      asset.kind === "native"
        ? "0x"
        : abi.encodeFunctionData("transfer", [
            getAddress(input.destination),
            input.amount,
          ]);
  if (
    getAddress(old.to) !== getAddress(to) ||
    old.data !== data ||
    old.value !== (asset.kind === "native" ? input.amount : 0n)
  )
    throw new Error("SIGNED_INTENT_INVALID");
  const proof = await chain.getTransactionStatus(asset, original);
  if (proof.contradiction || ["confirmed", "failed"].includes(proof.state))
    return;
  const height = await chain.currentBlockHeight();
  if (height < input.signedAtHeight + BigInt(input.stuckBlocks)) return;
  const estimated = await chain.estimateFee({
      asset,
      sender: input.sender,
      destination: input.destination,
      amount: input.amount,
    }),
    minimum = (old.gasPrice * 110n + 99n) / 100n,
    price = estimated.unitPrice > minimum ? estimated.unitPrice : minimum,
    limit = old.gasLimit,
    networkFee = price * limit,
    budget =
      (input.approvedNetworkFee * BigInt(100 + input.variancePercent)) / 100n;
  if (networkFee > budget) throw new Error("FEE_REQUOTE_REQUIRED");
  return chain.buildTransfer({
    asset,
    sender: input.sender,
    destination: input.destination,
    amount: input.amount,
    nonce: original.nonce,
    fee: {
      ...estimated,
      gasLimit: limit,
      unitPrice: price,
      nativeFee: networkFee,
      networkFee,
      accountSetupCost: 0n,
    },
  });
}
