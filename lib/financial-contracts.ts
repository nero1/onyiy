/** JSON transport types. Imports are type-only: no service/DB code enters a
 * client bundle. Derive DTOs from service results so renamed/missing financial
 * fields fail compilation while existing transaction ownership is preserved. */
import type {ProfilePresentation} from '@/server/presentation';
import type {PublicManifest} from '@gifters/config';
import type {dashboard,quoteWithdrawal} from '@/server/core';
import type {ownNativePortfolio} from '@/server/crypto-reads';
import type {quoteCryptoWithdrawal} from '@/server/crypto-payouts';

export type JsonWire<T> = T extends Date ? string : T extends bigint ? string :
 T extends readonly (infer Item)[] ? JsonWire<Item>[] :
 T extends object ? {[Key in keyof T]:JsonWire<T[Key]>} : T;
export type PublicManifestDto = PublicManifest & {payment_environment?:'simulation'|'testnet'|'mainnet';read_only_preview?:boolean;presentation?:ProfilePresentation;configuration_available?:boolean;client_compatibility?:{version:number;minimum_peer_version:number}};
type DashboardResult = JsonWire<Awaited<ReturnType<typeof dashboard>>>;
export type DashboardDto = Omit<DashboardResult,'wallet'> & {wallet:DashboardResult['wallet']|null};
export type DashboardCycle = DashboardDto['cycles'][number];
export type SimulationWithdrawalQuote = JsonWire<Awaited<ReturnType<typeof quoteWithdrawal>>>;
export type NativePortfolioDto = JsonWire<Awaited<ReturnType<typeof ownNativePortfolio>>>;
export type NativeWalletTotals = NativePortfolioDto['summary'][number];
export type NativeWithdrawalRow = NativePortfolioDto['withdrawals'][number];
export type NativeWithdrawalQuote = Pick<JsonWire<Awaited<ReturnType<typeof quoteCryptoWithdrawal>>>,
 'id'|'grossBaseUnits'|'chargeBaseUnits'|'netBaseUnits'|'destination'|'quoteExpiresAt'|'status'> & {
 feeSnapshot:{network_charge_base_units:string;account_setup_charge_base_units:string};
};
export type NativeWithdrawalReview = NativeWithdrawalQuote & {decimals:number;symbol:string;network:string};
