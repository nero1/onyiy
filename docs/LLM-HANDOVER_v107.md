# LLM handover v107

## Owner instructions

- Complete Phase One/Two, including real-money support, bugs and final verification. Continue substantial batches and merge checked PRs without milestone approval pauses.
- Launch credentials, countries, budget and business/legal inputs are deferred to final setup. Continue independent work; do not ask for them again now. Never invent live acceptance or elapsed observation periods.
- Keep **five core guides plus one versioned bug report**. No separate fix plan. New documents require an explicit owner request or an essential need; otherwise update an existing guide.
- Summarize fixed bugs by range only. For open bugs, record the brief problem, next fix and status. Omit fixed-bug histories, explanations and evidence. Shorten status/general explanations; **do not condense the PRD or strip detail from SETUP**. SETUP must retain a full beginner walkthrough: exact clicks, fields, values, checks and manual SQL. Put historical detail in Git, not repeated handovers.
- Rename status, handover and bug report together; update their links. SETUP uses beginner-friendly web UI steps and manually pasted SQL, without terminal/localhost instructions.
- Reuse provider accounts and database names. One active financial mode per shared database; Preview has public-only credentials.
- Named isolated manual procedures and mandatory checks are authorized; broad automated suites remain deferred. Preserve original/failed financial fixtures, packets and keys. Correct mistakes in fresh copies.
- Do not stop merely because a batch/PR is complete. Resume the next independent task; only a concrete missing input may block its dependent work.
- Both push and pull_request CI must pass the exact final head before merge. No direct main pushes; no subagents unless explicitly authorized.

## Resume

Repository `/workspace/onyiy` (`nero1/onyiy`). Branch `feat/native-keyboard-focus`, based on merged PR105 (`7aa47216430cb0eb427d121023d1854a94c03036`). Check this PR's state: finish/merge it if open; otherwise continue from current main. P1-112 local native keyboard/portfolio/integrity checks pass. Manual files: `/workspace/work/native-keyboard-v107`; preserve all copies. Continue C007/C010 and the independent tasks in [status](PROJECT-STATUS_v107.md). Do not stop after merge or request deferred launch inputs.

## Environment

- Read AGENTS and relevant Next16 docs before code changes. Node22: `/workspace/work/tooling/node-v22.23.3-linux-x64/bin`; PG tools: `/workspace/work/tooling/pg-tls/bin`.
- PostgreSQL55450 uses `/workspace/work/shared-hosting-v50/pgdata`, CA `server.crt`, owner/runtime roles `gw_v50_owner` / `gw_v50_runtime`. Keep TLS/port intact; never read the private TLS key.
- Preserve `gw_v81_eth_support_r1`, `gw_v78_product_simulation_r3`, failed `gw_v27_native_refund_isolated` and stopped clusters55455/55456. Scratch/evidence remains under `/workspace/work`; do not reset sources.
- Listeners/builds need additional network permission; Git mutations need `.git` write permission. Transport disconnects are infrastructure failures: inspect logs and retry without assuming a command ran.
- gh CLI credential expired; connected GitHub tools work. Publish committed objects, match the remote tree to the reviewed local tree, and verify both exact-head CI events. Align local main only after an identical-tree check.
- Never print generated secret env/cookie/key files. Keep them0600; web children receive no owner/signer keys. Preserve the session proxy and CA trust.

## Recovery and release constraints

- Fresh install is `packages/db/fresh-install.sql`: seven receipts; SQL000–005 immutable, SQL006 queue fix. Contract `schema-contract_v67.json`:96 tables/897 columns/301 checks/119 indexes.
- Recovery contract4 checks exact data/schema/security/migration fingerprints. Pre-006 contract4: matching PR65 `0ea4cf5e62a0ef7e7f83c26c1a512d6935775ac3`, then reviewed upgrade. Contract3: `6c323dc43c45efa1957308e467ce06e7cc0b36c0`; contract2: `25a5073d30974bcf8b02814bc81181e3a147d15c`. Never edit/re-sign packets.
- Preserve `production-v55/production-foundation-v55-r1.gwbackup` with `cross-host-r1/archive.key`; `mainnet-recovery-v63/mainnet-isolated-r2.gwbackup`/`.key`; `browser-recovery-v69/mainnet-seven-migrations-r1.gwbackup`/`.key`. Last two keys are raw32 bytes; cross-host key is encoded text. All paths are below `/workspace/work`.
- Restore requires an empty private target, disabled signing/scheduling, exact verification and fresh database-bound approvals. Retain original MFA/custody/payload keys; rotate request/auth keys. Unknown funds never prove missing member intent. Do not rewrite obligation/attempt snapshots.
- Four mainnets/eight protocols; seven member currencies, TRX operating-only. Real JAGA stays disabled without provenance. Generated providers/contracts/keys are not live evidence.
- Mainnet needs transparent settings, reviewed readiness, verified registry, configuration approvals and recent signed alert acknowledgement. Client wire1/min-client0/min-server1; do not weaken compatibility or financial gates.

v107
