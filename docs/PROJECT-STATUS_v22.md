# Project Status — Phase One

Updated: 12 October 2026. **56.00% implemented / 44.00% remaining.** Weighted implementation estimate, separate from acceptance/release permission. No hosted/live financial gate is declared passed.

**Owner directive:** implement all M0–M8 irrespective of M1/M2 or earlier acceptance. Move toward 100% Phase One in as few substantial verified iterations as practical; do not wait for deferred acceptance to implement later milestones. Record unrun evidence separately and keep unverified live sending disabled. This direction is also in PRD §31.

| Milestone | Weight | Implementation | Contribution | Verified / remaining |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 95% | 9.50% | 48 tables/RLS/grants, bounded policies and strict TLS. Hosted acceptance remains. |
| M1 — GIV money/queues | 15% | 99% | 14.85% | Fresh six financial scenarios and suspended receiver credit pass. Provider contracts remain. |
| M2 — identity/permissions | 15% | 90% | 13.50% | Cookie/MFA, restricted suspension access, audited roles/status/deletion/lost-factor reset, one-use appeals and expiry. CAPTCHA, blocked-account liability recovery and live Google remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | Verifier/signer/gas/business settlement implementation remains. |
| M4 — responsive product | 15% | 70% | 10.50% | EN/FR public help/PWA/inbox and account/moderation pages. Complete history/referrals/receipts/routes/accessibility remain. |
| M5 — admin/portability/recovery | 10% | 52% | 5.20% | Audited settings/help/priority, moderation/status/privacy and bounded messages; encrypted43-retained-table restore. Plan/bootstrap/portability remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | Named additional chain adapters remain. |
| M7 — bounded prototype release | 7% | 35% | 2.45% | Public-only PWA and190.65KiB homepage pass. Hosted/provider/mobile installation measurements remain. |
| M8 — financial acceptance tooling | 5% | 0% | 0.00% | Signer/alerts/caps/live recovery/monitoring implementation and evidence remain. |
| **Total** | **100%** | | **56.00%** | **44.00% implementation remains.** |

Calculation:9.50+14.85+13.50+0+10.50+5.20+0+2.45+0=56.00. Hosted absence does not block implementation.

## Completed this iteration

- PR#20 merged after both exact-head checks passed (head b31e5c151237eee9a7bb4a3da19f83185a003ebe; main7741f99eb75708e45c2edb4cbb9deedddb108d97). Continued immediately into account/moderation without waiting for acceptance.
- Migration020 adds account revisions/temporary suspension state plus reports/appeals. Moderator permissions are live typed checks; staff MFA and transaction fences apply. Sorted actor/target locks serialize edits. Members/moderators cannot gain finance powers, delete/ban/assign roles or affect staff accounts. Staff cannot mutate themselves or remove an admin through these controls.
- Versioned audited suspension/restore, ban, member/moderator assignment, verified lost-factor reset and confirmed deletion retain all UUID financial references and accrued rights. Status/role changes revoke families. Deleted profiles become terminal DB-guarded tombstones; email, exposed referral code and auth identities/factors/sessions/recovery secrets are removed. Case prose is redacted for affected users; immutable financial history remains.
- Suspended users may authenticate only to restricted account/case/help/security access. New gifts/withdrawals/dashboard fail. Existing receiver allocations continue. Deactivation is an own-account operation with a live family lock and revocation; deactivated users retain history/withdrawal eligibility. Temporary suspensions restore prior active/deactivated status, using DB clock and audit, on sign-in or a bounded100-user scheduler page.
- Reports dedupe actor/target/normalized reason within policy hours. Reviewed cases offer expiring15-minute tokens bound to the authenticated family; appeal consumption and permanent replay commit together. Staff resolution requires revision/reason/audit. Tokens are memory-only; restored sessions cannot resume them.
- Added EN/FR account/reports/appeals and staff moderation pages with reason/version controls, own balances, protected deletion/recovery inputs and private notices. Portals store no private snapshots and reject late scope responses. Auth controls guard delayed setup/verification/logout callbacks against changed account/family.
- Bounded admin direct/selected-recipient notification batches (at most100 distinct IDs/2000 characters) use existing durable outbox/jobs and permanent payload-bound keys. Moderator arbitrary/bulk messages remain denied.

## Verification actually performed

- Fresh restricted-runtime full M1 sequence passed all six named financial scenarios on migration020: gifts, integrity, jobs, withdrawal recovery, incoming and reorg/reconfirmation. No reset occurred.
- Cookie moderator MFA/permissions/redacted user list, revision/replay/conflicts, old-family revocation, suspended restricted access, report dedupe/ownership, one-use appeals/resolution, restoration and own deactivation/reactivation passed. Administrative-only changes retained an exact ledger-posting fingerprint.
- Ban blocked normal login; verified deletion removed auth/profile/exposed referral state and kept postings unchanged. Tombstone resurrection failed. Admin notification dedupe queued one recipient once; moderators were denied; final reconciliation balanced/consistent.
- Lost-factor reset revoked all target families without money changes. A suspended existing receiver received another normal confirmed allocation; restored flags/status and reconciliation passed. Disabled moderation API/page404 passed.
- Current-build username-based reports and family-bound appeal proof rejected a new-family reuse, accepted fresh proof and replayed exactly once. Actual390px EN/FR own account/report and staff MFA/account selection/suspend/lift observations are recorded with this build.
- New encrypted native roundtrip verified43 retained inventories across48 schemas/RLS/grants. Earlier archives, failed fixtures, logs and financial evidence remain preserved. Drizzle generated/check passed; static/build/bundle/grant/secret/docs checks pass (107 EN/FR keys,48/48 tables,190.65KiB actual homepage gzip). No dependency changed; exact-head CI repeats clean installation. No broad suite was added.
- Fixed the observed account balance-reader grant mismatch. Retained the first failed fixture and scratch browser label failure and corrected mobile account-selector overflow; neither rewrote money.

## Remaining work and acceptance dependencies

Chain verifier/signer/native gas/business settlement/alerts and named adapters remain unimplemented. CAPTCHA, last-admin recovery/verified liability recovery for banned/deleted accounts, product exports/imports, plan CRUD/bootstrap, complete product routes/history/referrals/receipts and bounded identity cleanup remain. Supabase/Upstash/Vercel/Google are owner-deferred, deployment/real sending disabled. No hosted/live financial gate is passed.

Deletion retains immutable monetary/audit references and historical public wallet evidence; it does not promise blockchain erasure. Recovery keys stay outside backups; older archives require matching migrations/revision. Permanent business keys, retained failures and liabilities are never cleanup targets.

## Continue immediately

Finish this exact-head checked PR and merge. Implement substantial remaining product/plan/portability and chain/verifier/signer/alert contracts without waiting for M1/M2 acceptance. Preserve the owner directive, advance the pair to v23 after the next verified iteration and merge every completed iteration.

v22
