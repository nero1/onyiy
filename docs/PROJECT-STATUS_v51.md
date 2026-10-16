# Project status v51

Updated: **16 October 2026 at 09:21:01 PM WAT**.

## Current scope

The owner resumed work through Phase Two and final fixes. Continue without milestone-acceptance pauses; merge related PRs after both exact-final-head push and pull-request CI pass. Keep the five core docs plus the two requested trackers.

| Area | State |
|---|---|
| Round One | **73/74 implemented and locally verified**; P1-028 open |
| Rounds Two/Three | Authorized; follow Round One |
| Phase Two P2.0–P2.4 | Authorized; not started |
| Mainnet | Unimplemented/disabled; both readiness gates remain false |
| Current PR | Historical treasury inventory/recovery; local verification passed, final CI/merge pending |

## P1-009 implementation

- Added immutable `treasury_addresses`: atomic existing-history backfill and owner-controlled capture triggers for invoices, obligations, checkpoints and unmatched inflows. Expiry/zero balance does not erase monitoring. Indexed runtime reads avoid rescanning invoice history.
- Added staff pagination and selection of a known historical address for checkpoint creation. Exact confirmation binds the selected address. Current and historical fingerprints remain distinct.
- Existing scheduled observations select the least recently attempted historical address per asset/tick, flag retained funds for reconciliation and distinguish active-wallet observations from aggregate custody. No schedule change or extra provider account is required.
- Recovery requires all addresses’ balance witnesses at the same canonical cutoff before comparing combined custody with ledger/liabilities. Missing, changed or contradictory evidence remains held. EVM uses bounded before/after cutoff checks within 32 requests/18 seconds.
- The database service/signer release fence checks every retained address’s latest checkpoint/run. A clean current-address scan cannot bypass an old-address review; rotation without checkpoints is held.
- The original `000_initial_schema.sql` is unchanged. Paste new `001_historical_treasury_fence.sql` once afterward; it has the same validated standalone receipt contract. Hosted deployment still only verifies receipts.
- Schema evidence is `packages/db/schema-contract_v51.json`: **93 tables, 852 columns, 275 checks, 107 standalone indexes**. Prior objects/grants remain intact except the reviewed recovery function; new inventory permissions are SELECT-only for the service role.

## Verification

Private named evidence: `/workspace/work/treasury-v51`.

- Generated Drizzle/owner inventory-table columns/defaults/constraints/index/RLS matched; owner catalog comparison retained all prior schema/security entries except the intended recovery-function replacement.
- Historical/current checkpoint provenance, exact confirmation, unknown-address rejection, expired-invoice backfill and pagination beyond 100 addresses passed.
- Generated 40+60 custody and 104-address aggregation passed. Missing witnesses held; a later historical review blocked both service and signer fences. EVM/SOL adapter procedures used local provider fixtures; generated records rolled back.
- Direct unauthorized inventory mutation denied. Hostile default table/function privileges were removed. Actual encrypted backup, empty-target restore and independent verify retained both generated historical addresses and all **80 retained-table inventories**.
- Final owner-runner/manual-receipt parity and replay checks passed. Required `check:all`, production build and bundle checks passed: homepage **180.34 KiB / 200**, API **1.399 MiB / 3**, clients **0.662 MiB / 2**. Existing root README/AGENTS doc warnings remain. Both exact-head CI events are required before merge.

Failed fixtures/logs, signed evidence, archives and keys remain preserved. Original financial databases and the inconsistent `gw_v27_native_refund_isolated` source were untouched. No real signer, broadcast, mainnet activation or broad deferred automated suite ran. Hosted Google/Turnstile/RPC/Upstash, capacity and live-custody acceptance remain unrun.

## Next

Finish **P1-028** retention/archival, then fresh Rounds Two/Three, PRD §32 P2.0–P2.4 and final defects. Do not equate a clean audit or transparent presentation with financial/legal readiness.

[PR49](https://github.com/nero1/onyiy/pull/49) merged shared-resource hosting/setup. Historical schema/archive evidence remains in PR46–48 and Git. Archives predating `001` require their matching code release; never rewrite receipts, signed inventories or original archives to force compatibility.

[Setup](SETUP.md) · [Handover](LLM-HANDOVER_v51.md) · [Report](custom-bugs-report_v51.md) · [Plan](custom-bugs-fix-plan_v51.md).

v51
