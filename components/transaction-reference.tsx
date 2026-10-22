'use client';
import {transactionExplorerUrl} from '@/lib/chain-links';
import type {Locale} from '@/lib/i18n';
import CopyButton from './copy-button';
export default function TransactionReference({hash,network,environment,locale,registryExplorer}:{hash:string;network:string;environment:string;locale:Locale;registryExplorer?:string}){
 const href=transactionExplorerUrl({hash,network,environment,registryExplorer});
 return <span className="transaction-reference"><code className="wallet-address">{hash}</code>{' '}<CopyButton text={hash} locale={locale}>{locale==='fr'?'Copier la transaction':'Copy transaction'}</CopyButton>{href&&<> {' '}<a href={href} target="_blank" rel="noopener noreferrer">{locale==='fr'?'Voir sur l’explorateur':'View on explorer'}</a></>}</span>;
}
