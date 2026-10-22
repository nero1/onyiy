import type {PublicManifestDto} from '@/lib/financial-contracts';
import type {Locale} from '@/lib/i18n';
export default function MemberFeatureNavigation({policy,locale,status}:{policy:PublicManifestDto;locale:Locale;status:string}){
 const fr=locale==='fr',normal=['active','deactivated'].includes(status),links:{path:string;label:string}[]=[];
 if(normal&&policy.feature_wallets&&policy.entitlements_member.history)links.push({path:'/wallet/history',label:fr?'Historique des transactions':'Transaction history'});
 if(normal&&policy.feature_points)links.push({path:'/points',label:fr?'Points':'Points'});
 if(normal&&policy.feature_notifications)links.push({path:'/notifications',label:fr?'Notifications':'Notifications'});
 if(normal&&policy.feature_shares)links.push({path:'/share',label:fr?'Reçus de retrait':'Withdrawal receipts'});
 if(policy.feature_portability)links.push({path:'/settings/data',label:fr?'Exporter mes données':'Export my data'});
 return links.length?<nav className="member-tools" aria-label={fr?'Outils du compte':'Account tools'}>{links.map(row=><a key={row.path} href={row.path+'?locale='+locale}>{row.label}</a>)}</nav>:null;
}
