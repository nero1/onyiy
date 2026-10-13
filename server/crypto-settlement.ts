import type { AssetRegistry } from "@gifters/chains";
import { and, eq, sql } from "drizzle-orm";
import {
  assets,
  cryptoObligations,
  signedAttemptStatus,
  readManifest,
  type DbExecutor,
} from "@gifters/db";
import {
  attributableRefund,
  nativeFeeInAsset,
  type RateSnapshot,
} from "@gifters/domain";
import {
  registryAsset,
  adapter,
  platformAddress,
  assertFinancialEnvironment,
} from "./financial-config";
import { account, postJournal, lockUser } from "./core";
/** Workload identity supplies a known attempt ID; chain evidence supplies all amounts. */
export async function settleCryptoAttempt(
  tx: DbExecutor,
  attemptId: string,
  eventIndex: number,
) {
  assertFinancialEnvironment();
  const [attempt] = await tx
    .select()
    .from(signedAttemptStatus)
    .where(eq(signedAttemptStatus.id, attemptId))
    .limit(1);
  if (!attempt) throw new Error("NOT_FOUND");
  const [lookup] = await tx
    .select()
    .from(cryptoObligations)
    .where(eq(cryptoObligations.id, attempt.obligationId))
    .limit(1);
  if (!lookup) throw new Error("NOT_FOUND");
  if (lookup.userId) await lockUser(tx, lookup.userId);
  const [obligation] = await tx
    .select()
    .from(cryptoObligations)
    .where(eq(cryptoObligations.id, lookup.id))
    .for("update");
  if (obligation.status === "exception" && obligation.completedAt)
    return { status: "failed_closed" };
  if (["settled", "cancelled"].includes(obligation.status))
    return { status: obligation.status };
  if (!["signing", "broadcast", "exception"].includes(obligation.status))
    throw new Error("VERSION_CONFLICT");
  const [asset] = await tx
      .select()
      .from(assets)
      .where(eq(assets.id, obligation.assetId))
      .limit(1),
    registry = obligation.registrySnapshot as AssetRegistry,
    chain = await adapter(registry);
  const proof = await chain.verifyTransfer({
    asset: registry,
    hash: attempt.txHash,
    index: eventIndex,
    sender:
      obligation.treasurySender ??
      (() => {
        throw new Error("HISTORICAL_SENDER_REQUIRED");
      })(),
    destination: obligation.destination,
    amount: BigInt(obligation.netBaseUnits),
  });
  if (!["confirmed", "failed"].includes(proof.state) || proof.contradiction)
    return { status: "pending" };
  if (proof.actualNativeFee === undefined || proof.actualNativeFee < 0n)
    throw new Error("INVALID_PROOF");
  const networkCost = proof.actualNetworkFee ?? proof.actualNativeFee,
    setupCost = proof.accountSetupCost ?? 0n;
  if (
    networkCost < 0n ||
    setupCost < 0n ||
    networkCost + setupCost !== proof.actualNativeFee
  )
    throw new Error("INVALID_PROOF");
  // Failed/replacement attempts are never principal payouts. A resolved failed
  // attempt remains held for reviewed recovery until its lineage is closed.
  const [native] = await tx
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.environment, "testnet"),
        eq(assets.chainId, registry.network),
        eq(
          assets.symbol,
          ({ eth: "ETH", bnb: "BNB", sol: "SOL", tron: "TRX" } as const)[
            registry.chain
          ],
        ),
      ),
    )
    .limit(1);
  if (!native) throw new Error("CONFIGURATION_INVALID");
  const cash = await account(
      tx,
      asset.id,
      "system",
      null,
      "treasury_asset",
      "debit",
    ),
    gasCash = await account(
      tx,
      native.id,
      "system",
      null,
      "treasury_asset",
      "debit",
    ),
    gasExpense = await account(
      tx,
      native.id,
      "platform",
      null,
      "network_fee_expense",
      "debit",
    );
  if (networkCost > 0n)
    await postJournal(
      tx,
      "GAS_OUT",
      `gas:testnet:${registry.chain}:${attempt.txHash}`,
      [
        {
          accountId: gasExpense.id,
          direction: "debit",
          amount: networkCost,
        },
        {
          accountId: gasCash.id,
          direction: "credit",
          amount: networkCost,
        },
      ],
      {
        attempt_id: attempt.id,
        obligation_id: obligation.id,
        block_hash: proof.blockHash,
      },
    );
  if (setupCost > 0n) {
    const setup = await account(
      tx,
      native.id,
      "platform",
      null,
      "recipient_account_setup_expense",
      "debit",
    );
    await postJournal(
      tx,
      "ACCOUNT_SETUP_OUT",
      `account-setup:${registry.chain}:${attempt.txHash}`,
      [
        { accountId: setup.id, direction: "debit", amount: setupCost },
        { accountId: gasCash.id, direction: "credit", amount: setupCost },
      ],
      {
        attempt_id: attempt.id,
        obligation_id: obligation.id,
        recipient: obligation.destination,
      },
    );
  }
  const approvedNetwork = BigInt(
      (obligation.feeSnapshot as { networkFee?: string }).networkFee ??
        obligation.nativeFeeQuote,
    ),
    approvedSetup = BigInt(
      (obligation.feeSnapshot as { accountSetupCost?: string })
        .accountSetupCost ?? "0",
    );
  // Reclassify measured excess expense; cash was reduced only by GAS_OUT/setup.
  // Valuation metadata creates no token conversion or extra beneficiary debit.
  for (const [label, actual, approved, purpose] of [
    ["network", networkCost, approvedNetwork, "network_fee_expense"],
    ["setup", setupCost, approvedSetup, "recipient_account_setup_expense"],
  ] as const) {
    if (actual > approved) {
      const variance = await account(
          tx,
          native.id,
          "platform",
          null,
          "fee_variance_expense",
          "debit",
        ),
        expense = await account(
          tx,
          native.id,
          "platform",
          null,
          purpose,
          "debit",
        );
      await postJournal(
        tx,
        "GAS_VARIANCE",
        `gas-variance:${registry.chain}:${attempt.txHash}:${label}`,
        [
          {
            accountId: variance.id,
            direction: "debit",
            amount: actual - approved,
          },
          {
            accountId: expense.id,
            direction: "credit",
            amount: actual - approved,
          },
        ],
        {
          obligation_id: obligation.id,
          attempt_id: attempt.id,
          component: label,
          quoted_native: approved.toString(),
          actual_native: actual.toString(),
          withdrawal_asset_id: asset.id,
          approved_charge: obligation.chargeBaseUnits,
          actual_at_pinned_rate: (
            nativeFeeInAsset(
              networkCost,
              obligation.rateSnapshot as RateSnapshot,
            ) +
            nativeFeeInAsset(setupCost, obligation.rateSnapshot as RateSnapshot)
          ).toString(),
        },
      );
    }
  }
  if (proof.state === "failed") {
    await tx
      .update(cryptoObligations)
      .set({ status: "exception" })
      .where(eq(cryptoObligations.id, obligation.id));
    return {
      status: "exception",
      attempt_state: "failed",
      actual_native_fee: proof.actualNativeFee.toString(),
    };
  }
  const gross = BigInt(obligation.grossBaseUnits),
    net = BigInt(obligation.netBaseUnits),
    charge = BigInt(obligation.chargeBaseUnits),
    held = await account(
      tx,
      asset.id,
      obligation.userId ? "user" : "platform",
      obligation.userId,
      "held_payable",
      "credit",
    );
  await postJournal(
    tx,
    obligation.kind === "sweep"
      ? "TREASURY_SWEEP_SETTLE"
      : obligation.kind === "business"
      ? "BUSINESS_SETTLEMENT_SETTLE"
      : ["refund","unallocated_refund"].includes(obligation.kind)
        ? "REFUND_SETTLE"
        : "PAYOUT_SETTLE",
    `crypto-settle:${obligation.id}`,
    [
      { accountId: held.id, direction: "debit", amount: net },
      { accountId: cash.id, direction: "credit", amount: net },
    ],
    { obligation_id: obligation.id, attempt_id: attempt.id },
  );
  if(obligation.kind==="sweep") {
    const reserve=await account(tx,asset.id,"system",null,"reserve_treasury_asset","debit"),clearing=await account(tx,asset.id,"system",null,"treasury_sweep_clearing","debit");
    await postJournal(tx,"TREASURY_SWEEP_MOVE",`treasury-sweep-move:${obligation.id}`,[{accountId:reserve.id,direction:"debit",amount:net},{accountId:clearing.id,direction:"credit",amount:net}],{obligation_id:obligation.id,attempt_id:attempt.id});
  }
  if (charge > 0n) {
    const recovery = await account(
      tx,
      asset.id,
      "platform",
      null,
      "fee_recovery_equity",
      "credit",
    );
    await postJournal(
      tx,
      "WITHDRAWAL_FEE_CHARGE",
      `crypto-charge:${obligation.id}`,
      [
        { accountId: held.id, direction: "debit", amount: charge },
        { accountId: recovery.id, direction: "credit", amount: charge },
      ],
      { obligation_id: obligation.id },
    );
    if (obligation.userId) {
      const refund = attributableRefund(
        charge,
        networkCost,
        obligation.rateSnapshot as RateSnapshot,
        setupCost,
      );
      if (refund > 0n) {
        const available = await account(
          tx,
          asset.id,
          "user",
          obligation.userId,
          "available_payable",
          "credit",
        );
        await postJournal(
          tx,
          "WITHDRAWAL_FEE_REFUND",
          `crypto-fee-refund:${obligation.id}`,
          [
            { accountId: recovery.id, direction: "debit", amount: refund },
            { accountId: available.id, direction: "credit", amount: refund },
          ],
          { obligation_id: obligation.id },
        );
      }
    }
  }
  await tx
    .update(cryptoObligations)
    .set({ status: "settled", completedAt: sql`clock_timestamp()` })
    .where(eq(cryptoObligations.id, obligation.id));
  return {
    status: "settled",
    gross_base_units: gross.toString(),
    net_base_units: net.toString(),
    charge_base_units: charge.toString(),
    actual_native_fee: proof.actualNativeFee.toString(),
  };
}
