import {z} from 'zod';
const positive=z.number().int().positive();
const text=z.string().trim().min(1).max(5000);
const content=z.object({mechanics:text,risk:text,fees:text,example:text,slots:text,bootstrap_label:text,priority_label:text,empty_queue:text}).strict();
export const transparencyDefaults={
 activity_epoch:1,feature_transparency:false,profile_revision:1,bootstrap_presentation:'legacy' as const,priority_presentation:'legacy' as const,activity_presentation:'fixtures' as const,
 transparency_content:{version:'transparency-1',en:{
  mechanics:'Send a crypto gift, join its receiver queue, and become eligible for allocations from later participants.',
  risk:'Receipts depend on later participants and are not guaranteed. You may receive less than you send.',
  fees:'You pay incoming network gas. A withdrawal deducts only the charges you approve, including any account setup charge. Platform reserves pay business settlement fees. Internal credits are separate from transfers to your wallet.',
  example:'At the default 85% receiver share, a $200-equivalent gift may receive two $170-equivalent internal credits: $340 gross only if both later gifts confirm. Withdrawal charges reduce any amount sent to your wallet. This is a conditional example, not a promised return.',
  slots:'Each gift adds its configured receipt target to the queue while funding one receiver allocation. At a target of two, one new unfunded conditional slot remains per gift. Money for all future receipts is not already held.',
  bootstrap_label:'Platform-controlled position',priority_label:'Administrative priority applies to this queue',
  empty_queue:'When no receiver is waiting, the selected startup rule either blocks checkout or credits the first receiver share to the disclosed developer/marketing role. That business allocation is not a member payout.',
 },fr:{
  mechanics:'Envoyez un don en crypto, rejoignez sa file de réception et devenez admissible aux allocations de participants ultérieurs.',
  risk:'Les réceptions dépendent de participants ultérieurs et ne sont pas garanties. Vous pouvez recevoir moins que votre don.',
  fees:'Vous payez le coût réseau du don entrant. Un retrait déduit uniquement les frais approuvés, y compris la création éventuelle d’un compte. Les réserves de la plateforme paient les règlements professionnels. Un crédit interne est distinct d’un transfert vers votre portefeuille.',
  example:'Avec la part destinataire par défaut de 85 %, un don équivalent à 200 $ peut recevoir deux crédits internes de 170 $, soit 340 $ bruts uniquement si les deux dons ultérieurs sont confirmés. Les frais de retrait réduisent le montant envoyé au portefeuille. Cet exemple est conditionnel, sans rendement promis.',
  slots:'Chaque don ajoute son objectif de réceptions à la file tout en finançant une allocation. Avec un objectif de deux, chaque don laisse une place conditionnelle supplémentaire non financée. L’argent de toutes les réceptions futures n’est pas déjà détenu.',
  bootstrap_label:'Position contrôlée par la plateforme',priority_label:'Une priorité administrative s’applique à cette file',
  empty_queue:'Si personne n’attend, la règle de démarrage bloque le paiement ou crédite la première part destinataire au rôle développeur/marketing annoncé. Cette allocation professionnelle n’est pas un paiement à un membre.',
 }},
 verified_activity_policy:{require_opt_in:true as const,max_records:50,max_age_hours:24,exclude_system:true as const,exclude_test:true as const},
 queue_disclosure_policy:{show_system_ahead:true,show_priority_ahead:true,show_snapshot_time:true},
 public_receipt_policy:{show_asset:true,show_network:true,show_time:true,mask_identity:true,show_environment:true},
 transparency_snapshot_policy:{preview_ttl_minutes:15,client_poll_seconds:60},
 financial_readiness_record:{status:'not_reviewed' as const,evidence_refs:[] as string[]},
};
export const transparencyFields={
 activity_epoch:positive.max(9007199254740991).default(1),feature_transparency:z.boolean().default(false),profile_revision:positive.max(2147483647).default(1),
 bootstrap_presentation:z.enum(['legacy','labelled','disabled']).default('legacy'),priority_presentation:z.enum(['legacy','disclosed','disabled']).default('legacy'),activity_presentation:z.enum(['fixtures','verified','labelled_demo','disabled']).default('fixtures'),
 transparency_content:z.object({version:z.string().regex(/^[A-Za-z0-9._-]{1,80}$/),en:content,fr:content}).strict().default(transparencyDefaults.transparency_content),
 verified_activity_policy:z.object({require_opt_in:z.literal(true),max_records:positive.max(50),max_age_hours:positive.max(720),exclude_system:z.literal(true),exclude_test:z.literal(true)}).strict().default(transparencyDefaults.verified_activity_policy),
 queue_disclosure_policy:z.object({show_system_ahead:z.boolean(),show_priority_ahead:z.boolean(),show_snapshot_time:z.boolean()}).strict().default(transparencyDefaults.queue_disclosure_policy),
 public_receipt_policy:z.object({show_asset:z.boolean(),show_network:z.boolean(),show_time:z.boolean(),mask_identity:z.boolean(),show_environment:z.boolean()}).strict().default(transparencyDefaults.public_receipt_policy),
 transparency_snapshot_policy:z.object({preview_ttl_minutes:positive.max(15),client_poll_seconds:positive.min(15).max(300)}).strict().default(transparencyDefaults.transparency_snapshot_policy),
 financial_readiness_record:z.object({status:z.enum(['not_reviewed','approved','rejected']),evidence_refs:z.array(z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/)).max(50)}).strict().refine(value=>value.status!=='approved'||value.evidence_refs.length>0).default(transparencyDefaults.financial_readiness_record),
};
export const transparencySettingKeys=new Set(['deployment_profile',...Object.keys(transparencyFields)]);
export function validateTransparentConfiguration(value:{deployment_profile:string;feature_transparency:boolean;bootstrap_presentation:string;priority_presentation:string;activity_presentation:string;queue_disclosure_policy:{show_system_ahead:boolean;show_priority_ahead:boolean;show_snapshot_time:boolean};public_receipt_policy:{show_asset:boolean;show_network:boolean;show_time:boolean;mask_identity:boolean;show_environment:boolean}}){
 if(value.deployment_profile!=='transparent')return;
 if(!value.feature_transparency||!['labelled','disabled'].includes(value.bootstrap_presentation)||!['disclosed','disabled'].includes(value.priority_presentation)||!['verified','labelled_demo','disabled'].includes(value.activity_presentation)||Object.values(value.queue_disclosure_policy).some(flag=>!flag)||Object.values(value.public_receipt_policy).some(flag=>!flag))throw new Error('CONFIGURATION_INVALID');
}
