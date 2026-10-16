# Project status v52

Updated: **17 October 2026 at 12:42:22 AM WAT**.

## Scope and progress

The owner authorized continuous work through Phase Two and final fixes. Do not pause for milestone acceptance. Merge only after both exact-final-head push and pull-request CI succeed. Keep five core docs plus the two requested trackers.

| Area | State |
|---|---|
| Round One | **74/74 implemented and locally verified**; this batch's release checks/merge pending |
| Rounds Two/Three | Fresh reviews follow this merge; incidental R2-001/002/003 fixed |
| Phase Two P2.0–P2.4 | Authorized; not started |
| Mainnet | Unsupported/disabled; both readiness gates remain false |

## Current retention batch

- New forward SQL `002` expires old notice bodies and compacts only completed expendable job/outbox payloads. Holds, immutable keys, unfinished work and financial lineage remain protected. Direct retirement-field writes are denied; ordinary worker updates retain only their required columns.
- `003` creates same-database monthly online partitions for ledger postings, scan pages and audit events. Global identities are enforced across months. Journals/events retain global registries. Two bounded checksum passes precede archival; old rows remain readable. This reduces hot indexes, **not total storage usage**. No financial deletion occurs.
- Admin Operations has scoped paginated retention progress and an authenticated, fresh-MFA, reasoned/idempotent batch action. Scheduled cleanup also advances bounded batches behind job/run lease fences.
- R2-001 binds column grants and partition metadata/indexes into signed recovery contract v2. Old packets require their historical release; signatures/checksums remain untouched.
- R2-002 classifies actual lock timeout `55P03` as transient. R2-003 now respects the admission cooldown once before retrying failure recording with fresh lease checks.

## Verification

Private named evidence: `/workspace/work/retention-v52`; only fresh copies/generated records were used. Original financial sources, failed fixtures, archives and keys remain preserved.

- Fresh manual SQL installs and standalone receipt checks; hold/bounds/age/work-kind filters, body/payload hashes, direct-write permission denial, retry identity and notification list/badge/read behavior passed.
- Partition conversion preserved every source UUID, timestamp, large integer amount and protected ledger counter. A new balanced service journal, deferred financial guards, global UUID rejection and frozen-month rejection passed. Child tables have owner-only permissions.
- A 203-row historical month completed both checksum passes in steps of at most 100; records remained readable.
- Generated Drizzle and installed logical columns/defaults matched; normalized constraints and indexes matched. Reviewed SQL-only deferred timing/triggers/partitioning remain explicit. Machine evidence: `packages/db/schema-contract_v52.json`, **95 logical tables, 874 columns, 288 checks, 114 standalone indexes**.
- Actual encrypted backup, fresh empty-target restore and independent verification passed. Column-only permission drift changes the fingerprint. An older signed packet is refused before target bootstrap/DDL/data.
- Real lock-timeout classification and immediate durable failure recording passed with the bounded cooldown retry.
- Required checks, production build and bundle limits passed. Homepage 180.34 KiB/200 KiB; API trace 1.411 MiB/3 MiB; all client chunks 0.663 MiB/2 MiB. Hosted packaging/capacity remains unmeasured. Exact-final-head dual CI/merge remain pending.
- More than100 archive months paginated without duplicate rows; actor/view cursor changes rejected. Manual action and job-lease replay passed; stale job/scheduler leases could not advance archives. Bounded default-partition transfer preserved IDs/keys/counters and removed hostile default permissions. A generated checksum mismatch stayed in review with an accurate audit.

## Prior merge and next work

[PR50](https://github.com/nero1/onyiy/pull/50) merged as `922661dbfa88832069f459f42838c8352eff4f59`; exact head `64f004a9d695a2c7a5c4f1117d0818b7c78cdae7` passed push **38962672072** and PR **38962730310**.

Finish this release, then perform fresh Rounds Two/Three and complete PRD §32 P2.0–P2.4 plus final defects. Actual hosted Google/Turnstile/RPC/Upstash/domain/capacity acceptance remains unrun. Local evidence cannot substitute for mainnet custody, signing, legal or external release evidence.

v52
