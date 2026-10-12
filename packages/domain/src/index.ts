export const BASIS_POINTS_TOTAL = 10_000;
export const GIV_DECIMALS = 2;
export const GIV_FACTOR = 10n ** BigInt(GIV_DECIMALS);

export const roles = ["member", "moderator", "admin"] as const;
export type Role = (typeof roles)[number];

export const accountStatuses = ["pending_consent", "active", "suspended", "banned", "deactivated", "deleted"] as const;
export type AccountStatus = (typeof accountStatuses)[number];

export const environments = ["simulation", "testnet", "mainnet"] as const;
export type Environment = (typeof environments)[number];

export const planStatuses = ["disabled", "scheduled", "active", "paused", "retired"] as const;
export type PlanStatus = (typeof planStatuses)[number];

export const cycleStatuses = ["active", "completed", "exception"] as const;
export type CycleStatus = (typeof cycleStatuses)[number];

export const queueEntryStatuses = ["waiting", "fully_allocated", "fulfilled", "removed"] as const;
export type QueueEntryStatus = (typeof queueEntryStatuses)[number];

export const queueEntryKinds = ["member", "bootstrap"] as const;
export type QueueEntryKind = (typeof queueEntryKinds)[number];

export const withdrawalStatuses = ["quoted", "held", "awaiting_requote", "approved", "sending", "settled", "cancelled", "exception"] as const;
export type WithdrawalStatus = (typeof withdrawalStatuses)[number];

export const ledgerTypes = [
  "GIV_GRANT","GIFT_IN","RECEIVER_ALLOCATE","REFERRAL_ALLOCATE","MARKETING_ALLOCATE","DEV_ALLOCATE","RESERVE_ALLOCATE",
  "REFERRAL_FALLBACK_ALLOCATE","PAYOUT_HOLD","PAYOUT_SETTLE","HOLD_RELEASE","WITHDRAWAL_FEE_CHARGE","WITHDRAWAL_FEE_REFUND",
  "GAS_VARIANCE","BUSINESS_SETTLEMENT_HOLD","BUSINESS_SETTLEMENT_SETTLE","BUSINESS_FEE_CHARGE","GAS_OUT","SURPLUS_HOLD","REFUND_HOLD",
  "REFUND_SETTLE","REORG_COMPENSATE","ADMIN_ADJUST","TREASURY_SWEEP"
] as const;
export type LedgerType = (typeof ledgerTypes)[number];

export type PaymentSplitBps = {
  receiver: number;
  marketing: number;
  referral: number;
  developer: number;
  reserve: number;
};

export function assertValidSplit(split: PaymentSplitBps): void {
  const total = Object.values(split).reduce((a, b) => a + b, 0);
  if (total !== BASIS_POINTS_TOTAL) throw new Error(`payment split must total ${BASIS_POINTS_TOTAL}, got ${total}`);
  for (const [key, value] of Object.entries(split)) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`invalid bps for ${key}`);
  }
}

export function splitAmount(amount: bigint, split: PaymentSplitBps) {
  assertValidSplit(split);
  const receiver = amount * BigInt(split.receiver) / 10_000n;
  const marketing = amount * BigInt(split.marketing) / 10_000n;
  const referral = amount * BigInt(split.referral) / 10_000n;
  const developer = amount * BigInt(split.developer) / 10_000n;
  const reserve = amount - receiver - marketing - referral - developer;
  return { receiver, marketing, referral, developer, reserve };
}

export function usdToGivBaseUnits(usd: number): bigint {
  if (!Number.isFinite(usd) || usd <= 0) throw new Error("invalid usd amount");
  return BigInt(Math.round(usd * Number(GIV_FACTOR)));
}

export function formatBaseUnits(value: bigint | string, decimals = GIV_DECIMALS): string {
  const amount = typeof value === "bigint" ? value : BigInt(value);
  const factor = 10n ** BigInt(decimals);
  const whole = amount / factor;
  const fraction = (amount % factor).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export const planTemplates = [
  ["Bronze", 5], ["Silver", 10], ["Gold", 20], ["Diamond", 30], ["Platinum", 50], ["Super", 70],
  ["Mega", 100], ["Giga", 150], ["Ultra", 250], ["Stellar", 500], ["Royal", 1000], ["Mythic", 2500]
] as const;

export function giftPointAward(usdReference: number) {
  return usdReference >= 100 ? { sender: 50, referrer: 10 } : { sender: 25, referrer: 5 };
}
