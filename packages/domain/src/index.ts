export const BASIS_POINTS_TOTAL = 10_000;
export const QUEUE_TICKET_BITS = 40;
export const QUEUE_TICKET_CEILING = 2 ** QUEUE_TICKET_BITS;
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
  "GIV_GRANT","CHAIN_IN","NATIVE_TOPUP","GIFT_IN","RECEIVER_ALLOCATE","REFERRAL_ALLOCATE","MARKETING_ALLOCATE","DEV_ALLOCATE","RESERVE_ALLOCATE",
  "REFERRAL_FALLBACK_ALLOCATE","PAYOUT_HOLD","PAYOUT_SETTLE","HOLD_RELEASE","WITHDRAWAL_FEE_CHARGE","WITHDRAWAL_FEE_REFUND",
  "GAS_VARIANCE","BUSINESS_SETTLEMENT_HOLD","BUSINESS_SETTLEMENT_SETTLE","BUSINESS_FEE_CHARGE","GAS_OUT","ACCOUNT_SETUP_OUT","SURPLUS_HOLD","REFUND_HOLD",
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
  return decimalToBaseUnits(String(usd), GIV_DECIMALS);
}

export function decimalToBaseUnits(value: string, decimals = GIV_DECIMALS): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 78 || !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value)) throw new Error('INVALID_INPUT');
  const [whole,fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new Error('INVALID_INPUT');
  const units = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals,'0') || '0');
  if (units <= 0n || units.toString().length > 78) throw new Error('INVALID_INPUT');
  return units;
}

export function formatBaseUnits(value: bigint | string, decimals = GIV_DECIMALS): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 78) throw new Error('INVALID_INPUT');
  const amount = typeof value === "bigint" ? value : BigInt(value);
  const magnitude = amount < 0n ? -amount : amount;
  const factor = 10n ** BigInt(decimals);
  const whole = magnitude / factor;
  const fraction = (magnitude % factor).toString().padStart(decimals, "0").replace(/0+$/, "");
  return (amount < 0n ? '-' : '') + (fraction ? `${whole}.${fraction}` : whole.toString());
}

export function giftPointAward(usdReference: string, rules: { usd_threshold:number; sender_low:number; sender_high:number; referrer_low:number; referrer_high:number }) {
  return decimalToBaseUnits(usdReference) >= decimalToBaseUnits(String(rules.usd_threshold))
    ? { sender: rules.sender_high, referrer: rules.referrer_high }
    : { sender: rules.sender_low, referrer: rules.referrer_low };
}

export * from './fees';
