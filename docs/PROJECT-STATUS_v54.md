# Project status v54

Updated: **17 October 2026 at 01:06:45 UTC**.

| Area | State |
|---|---|
| Round One | 74/74 implemented/local verified/merged in PR51 |
| Rounds Two/Three | Named findings fixed/local verified/merged in PR52 |
| Phase Two | P2.0–P2.4 implementation and local verification complete in [PR53](https://github.com/nero1/onyiy/pull/53) |
| Mainnet | Unsupported/disabled; both readiness gates remain false |

## Phase Two implementation

- P2.0: validated settings/defaults, one staged preset, expiring previews, manifest/profile version checks and admin-only commit/readiness APIs are implemented in the working branch. The existing test profile remains the default.
- P2.1/P2.3: transaction fencing, exact queue revision checks, cancelled-slot metadata, removal of waiting bootstrap/priority positions, retained financial obligations, old-quote expiry and prior submitted-invoice rights are implemented. Member-owned actual-rank disclosure is available in SQL. Public/member screens now use the same profile-versioned DTO.
- P2.2: public DTO, EN/FR screens, opt-in verified activity/statistics, consent controls and labelled receipt previews are implemented; simulation/testnet cannot supply real-payment stories.
- P2.4: the admin assessment explicitly lists missing custody, funding/closure, jurisdiction, copy, budget and hosted evidence. No readiness approval is inferred.
- Forward SQL004 must ship with the matching verified/merged application release. Installed000–003 stay unchanged. Fresh generated-model comparison passed:96 logical tables,892 columns,298 checks,119 standalone indexes; machine contract v54 records the proof.

## Current evidence

Private work: `/workspace/work/phase-two-v54`. Only fresh isolated fixtures/generated data were used; original sources, failed fixtures, archives and keys remain preserved.

- SQL004 standalone receipt/manual install and actual owner seeder passed on fresh simulation databases.
- `profile-procedure-r6.mts` passed: Phase One defaults, real partial bootstrap allocation, stale queue preview rejection, complete transaction rollback, atomic disabled preset/replay, unchanged balances during switching,19 cancelled unallocated slots, unchanged joining ticket11 with actual position1, old quote expiry, and earlier submitted-invoice confirmation under its original terms/amount.
- Found/fixed P2-B001: priority/bootstrap entry changes were not reliably advancing the partition revision used by previews. A protected trigger now advances it for every queue-entry change and enforces a safe integer bound.
- Twelve preset previews, required disclosure flags, non-admin rejection, consent CAS/withdrawal, owner-only real-account classification and durable publication-cache invalidation passed. Actual encrypted backup, empty-target restore and independent exact verification passed (83 retained tables). Profile lock serialization, private ACL closure, owner promotion no-op compatibility and retention-hold cleanup passed. Required checks, production build and bundle bounds passed, including the receipt/control fixes. Pending accounts are excluded from transparent public counters. Built HTTP EN/FR disclosures, empty verified feed and unauthenticated admin denial passed. Rollback-only future read-model opt-in/withdrawal/privacy and guarded decimal-rate checks passed; no mainnet execution was enabled. Eight Phase Two review findings are fixed. PR53 checks and merge state are authoritative on GitHub; merge only after both exact-head push and pull-request checks succeed.

## Completed merges

- [PR52](https://github.com/nero1/onyiy/pull/52): merge `25a5073d30974bcf8b02814bc81181e3a147d15c`,17 October2026 at00:00:14UTC. Exact head `2e83f215348367b94c4a07ff1c56ce34c9b32d1c` passed push **38984142329** and PR **38984167385**.
- [PR51](https://github.com/nero1/onyiy/pull/51): merge `ccd474580bfadb0905c84309e049d822aae5094b`; exact head3884e51fa1c34d384726b7e5bac01eb67b1dc9eb passed push38983188930/PR38983219042.

Phase Two implementation and the final local bug review are complete. Hosted providers/capacity and real-money financial/business/legal readiness remain separate unrun evidence. No claim of zero possible defects or real-money readiness is made.

v54
