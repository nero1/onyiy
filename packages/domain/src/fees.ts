export type RateSnapshot = {
  assetUsd: string;
  nativeUsd: string;
  assetDecimals: number;
  nativeDecimals: number;
  observedAt: string;
  source: string;
};
const scale = 1000000000000000000n;
export function priceUnits(value: string) {
  if (!/^(0|[1-9][0-9]*)(\.[0-9]{1,18})?$/.test(value))
    throw new Error("PRICE_INVALID");
  const [whole, fraction = ""] = value.split("."),
    result = BigInt(whole) * scale + BigInt(fraction.padEnd(18, "0"));
  if (result <= 0n) throw new Error("PRICE_INVALID");
  return result;
}
export function ceilDivide(value: bigint, denominator: bigint) {
  if (value < 0n || denominator <= 0n) throw new Error("INVALID_INPUT");
  return (value + denominator - 1n) / denominator;
}
function validate(rate: RateSnapshot) {
  if (
    !Number.isInteger(rate.assetDecimals) ||
    rate.assetDecimals < 0 ||
    rate.assetDecimals > 78 ||
    !Number.isInteger(rate.nativeDecimals) ||
    rate.nativeDecimals < 0 ||
    rate.nativeDecimals > 18 ||
    !Number.isFinite(new Date(rate.observedAt).getTime()) ||
    !rate.source
  )
    throw new Error("PRICE_INVALID");
  priceUnits(rate.assetUsd);
  priceUnits(rate.nativeUsd);
}
export function nativeFeeInAsset(nativeCost: bigint, rate: RateSnapshot) {
  validate(rate);
  return ceilDivide(
    nativeCost * priceUnits(rate.nativeUsd) * 10n ** BigInt(rate.assetDecimals),
    priceUnits(rate.assetUsd) * 10n ** BigInt(rate.nativeDecimals),
  );
}
export function principalUsdMicros(principal: bigint, rate: RateSnapshot) {
  validate(rate);
  return ceilDivide(
    principal * priceUnits(rate.assetUsd) * 1000000n,
    scale * 10n ** BigInt(rate.assetDecimals),
  );
}
export function withdrawalBreakdown(
  gross: bigint,
  nativeQuote: bigint,
  rate: RateSnapshot,
  dust: bigint,
  setupNative: bigint = 0n,
) {
  if (gross <= 0n || nativeQuote < 0n || dust < 0n)
    throw new Error("INVALID_INPUT");
  const networkCharge = nativeFeeInAsset(nativeQuote, rate),
    accountSetupCharge = nativeFeeInAsset(setupNative, rate),
    charge = networkCharge + accountSetupCharge,
    net = gross - charge;
  if (net <= 0n || net < dust) throw new Error("WITHDRAWAL_NOT_VIABLE");
  return {
    gross,
    charge,
    net,
    nativeQuote: nativeQuote + setupNative,
    networkCharge,
    accountSetupCharge,
    rate,
  };
}
export function attributableRefund(
  approvedCharge: bigint,
  actualNativeCost: bigint,
  rate: RateSnapshot,
  setupNative: bigint = 0n,
) {
  if (approvedCharge < 0n || actualNativeCost < 0n)
    throw new Error("INVALID_INPUT");
  const actual =
    nativeFeeInAsset(actualNativeCost, rate) +
    nativeFeeInAsset(setupNative, rate);
  return actual >= approvedCharge ? 0n : approvedCharge - actual;
}
export function feeWithinVariance(
  approvedNativeCost: bigint,
  freshNativeCost: bigint,
  percent: number,
) {
  if (
    approvedNativeCost < 0n ||
    freshNativeCost < 0n ||
    !Number.isInteger(percent) ||
    percent < 0 ||
    percent > 25
  )
    throw new Error("INVALID_INPUT");
  return freshNativeCost * 100n <= approvedNativeCost * BigInt(100 + percent);
}
export function assertFreshRates(
  rate: RateSnapshot,
  maxAgeMinutes: number,
  now = new Date(),
) {
  validate(rate);
  const age = now.getTime() - new Date(rate.observedAt).getTime();
  if (
    !Number.isFinite(maxAgeMinutes) ||
    maxAgeMinutes <= 0 ||
    age < 0 ||
    age >= maxAgeMinutes * 60000
  )
    throw new Error("PRICE_STALE");
}

export function usdLimitMicros(value: string | number) {
  return (priceUnits(String(value)) * 1000000n) / 1000000000000000000n;
}

export function effectiveUsdLimitMicros(policy:string|number,hard:string){
  const policyLimit=usdLimitMicros(policy),hardLimit=usdLimitMicros(hard);
  return policyLimit<hardLimit?policyLimit:hardLimit;
}

/** Reserve only bounded payable work; leave the rest in the source balance. */
export function settlementSlice(total:bigint,maximum:bigint,minimum:bigint,limit:number){
  if(total<=0n||maximum<=0n||minimum<0n||minimum>maximum||!Number.isSafeInteger(limit)||limit<1||limit>100)throw new Error('WITHDRAWAL_NOT_VIABLE');
  const dust=minimum>0n?minimum:1n;
  const count=ceilDivide(total,maximum);
  if(total<count*dust)throw new Error('WITHDRAWAL_NOT_VIABLE');
  const base=total/count,extra=total%count;
  const legs=Array.from({length:count<BigInt(limit)?Number(count):limit},(_,i)=>base+(BigInt(i)<extra?1n:0n));
  const amount=legs.reduce((sum,value)=>sum+value,0n);
  return {legs,amount,remaining:total-amount};
}
