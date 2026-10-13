/** Every accepted beneficiary purpose must protect custody and sweep surplus. */
export const beneficiaryLiabilityPurposes=[
  'available_payable','held_payable','refund_payable','incoming_payable','unallocated_payable',
  'marketing_payable','developer_payable','bootstrap_developer_payable','bootstrap_marketing_payable',
  'bootstrap_platform_payable','bootstrap_custom_bootstrap_payable',
] as const;
export const businessSettlementRoles=['developer','marketing','bootstrap_developer','bootstrap_marketing','bootstrap_platform','bootstrap_custom_bootstrap'] as const;
export function businessAddressRole(purpose:string):'DEV'|'MARKETING'|'BOOTSTRAP'{
  if(['developer_payable','bootstrap_developer_payable'].includes(purpose))return 'DEV';
  if(['marketing_payable','bootstrap_marketing_payable'].includes(purpose))return 'MARKETING';
  if(['bootstrap_platform_payable','bootstrap_custom_bootstrap_payable'].includes(purpose))return 'BOOTSTRAP';
  throw new Error('INVALID_INPUT');
}
