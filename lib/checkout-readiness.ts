import {decimalToBaseUnits} from '@gifters/domain';
import type {AuthUser} from './auth-client';
import type {NativePortfolioDto,PublicManifestDto} from './financial-contracts';
import type {NativeCurrency} from './native-wallet';
import type {Locale} from './i18n';
type Plan={id:string;asset_id:string;status:string};
export function giftBlockReason({user,policy,portfolio,plan,currency,now=Date.now()}:{user:AuthUser;policy:PublicManifestDto;portfolio:NativePortfolioDto|null;plan:Plan;currency?:NativeCurrency;now?:number}):string|null{
 if(user.status!=='active')return 'ACCOUNT_RESTRICTED';
 if(!user.age_confirmed||(user.age_minimum_accepted??0)<policy.eligibility_min_age||user.consent_version!==policy.terms_content.version)return 'CONSENT_REQUIRED';
 if(!policy.feature_gifts||!policy.entitlements_member.send_enabled_gifts||plan.status!=='active'||!currency?.enabled||!currency.execution_enabled)return 'PLAN_UNAVAILABLE';
 if(!portfolio)return 'READINESS_UNAVAILABLE';
 const readiness=portfolio.gift_readiness;
 if(!readiness?.complete||readiness.profile_revision!==policy.profile_revision)return 'READINESS_UNAVAILABLE';
 if(readiness.active.some(row=>row.plan_id===plan.id&&row.asset_id===plan.asset_id))return 'ACTIVE_CYCLE_EXISTS';
 if(readiness.concurrent_limit_reached)return 'CYCLE_LIMIT_REACHED';
 if(readiness.cooldowns.some(row=>row.plan_id===plan.id&&row.asset_id===plan.asset_id&&Date.parse(row.until)>now))return 'COOLDOWN_ACTIVE';
 const wallet=portfolio.wallets.find(row=>row.network===currency.network);
 if(!wallet)return 'WALLET_REQUIRED';
 if(wallet.cooling_until&&Date.parse(wallet.cooling_until)>now)return 'WALLET_COOLING';
 if(portfolio.balances.some(row=>row.asset_id===plan.asset_id&&row.under_review))return 'FINANCIAL_SAFETY_PAUSE';
 return null;
}
export function withdrawalAmountFits(input:string,decimals:number,available:string){try{const value=decimalToBaseUnits(input.trim(),decimals);return value>0n&&value<=BigInt(available)}catch{return false;}}
export function giftBlockCopy(reason:string,locale:Locale){const fr=locale==='fr';return ({ACCOUNT_RESTRICTED:fr?'Ce compte ne peut pas envoyer de don.':'This account cannot send a gift.',CONSENT_REQUIRED:fr?'Terminez la vérification et acceptez les conditions actuelles.':'Complete eligibility and accept the current terms.',PLAN_UNAVAILABLE:fr?'Ce don ou cette monnaie n’est pas disponible.':'This gift or currency is unavailable.',READINESS_UNAVAILABLE:fr?'Actualisez pour vérifier votre admissibilité.':'Refresh to check your eligibility.',ACTIVE_CYCLE_EXISTS:fr?'Un cycle est déjà en cours pour ce don et cette monnaie.':'A cycle is already open for this gift and currency.',CYCLE_LIMIT_REACHED:fr?'Votre limite de cycles est atteinte.':'Your active-cycle limit is reached.',COOLDOWN_ACTIVE:fr?'Le délai avant un nouveau cycle n’est pas terminé.':'The rejoin cooldown has not ended.',WALLET_REQUIRED:fr?'Connectez et vérifiez un portefeuille sur ce réseau.':'Connect and verify a wallet on this network.',WALLET_COOLING:fr?'Le délai de sécurité du portefeuille n’est pas terminé.':'The wallet security cooldown has not ended.',FINANCIAL_SAFETY_PAUSE:fr?'Cette monnaie est en cours de révision.':'This currency is under review.'} as Record<string,string>)[reason]??(fr?'Actualisez pour continuer.':'Refresh to continue.');}
