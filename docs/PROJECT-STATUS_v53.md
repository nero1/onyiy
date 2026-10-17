# Project status v53

Updated: **17 October 2026 at 12:58:03 AM WAT**.

| Area | State |
|---|---|
| Round One | **74/74 implemented, locally verified and merged** |
| Round Two | Three fresh findings fixed/local verification passed; local release checks passed; exact-head CI/merge pending. Incidental R2-001–003 were fixed in PR51. |
| Round Three | R3-001 fixed/local checks passed in this batch; Phase Two follows |
| Mainnet | Unsupported/disabled; both readiness gates false |

## Current batch

- R2-004: bounded text reader handles byte/time/abort limits without waiting indefinitely for stream cancellation. HMAC readers preserve exact whitespace/UTF-8 bytes. Shared handling covers API JSON, worker/scheduler bodies, identity/bot-check responses and alert acknowledgements. Large binary staging stays streamed.
- R2-005: workers now use the API's temporary-error classification instead of dead-lettering capacity, cooldown and temporary provider failures. Broken pipes and wrapped errors remain retryable; cause traversal is bounded.
- R2-006: a missing live manifest cannot restore seeded feature availability or demo statements. API/SSR fallbacks disable features/activity/statistics and show brief EN/FR unavailable copy with a five-second freshness bound.

## Evidence

Private procedures: `/workspace/work/round-two-v53`; only generated streams and dedicated database copies were used. Original financial sources, failed fixtures, archives and keys remain preserved.

- Before/after oversized cancellation probe reproduced a request hanging past its deadline, then returning INVALID_INPUT. Ordinary timeout remained REQUEST_TIMEOUT.
- Exact Unicode/whitespace preservation, invalid UTF-8, signed worker authentication/nonce replay and stalled worker/scheduler aborts were checked.
- Capacity/circuit/temporary application errors originally produced dead letters. Fresh fixed fixtures persisted retry_wait/TRANSIENT_FAILURE.
- An empty-database fallback originally enabled gifts and50 fixture statements. The fix returns both features off and zero statements.
- Final required checks, production build and bundle limits passed for the combined changes. Homepage180.34KiB/200KiB, API1.411MiB/3MiB, clients0.663MiB/2MiB. Exact-final-head push/PR CI and merge remain pending.
- R3-001: an owned tool ignoring SIGTERM previously hung. Bounded two-second escalation stops only that subprocess; cancelled operations cannot publish an archive even on exit0. Both fault cases and a real encrypted backup/empty-target restore/independent verify passed. Private evidence: `/workspace/work/round-three-v54`.

## Merged retention release

[PR51](https://github.com/nero1/onyiy/pull/51) merged as `ccd474580bfadb0905c84309e049d822aae5094b` on16 October2026 at23:48:44UTC. Exact head `3884e51fa1c34d384726b7e5bac01eb67b1dc9eb` passed push **38983188930** and PR **38983219042** before merge.

It completed P1-028: held/bounded expendable payload retention, same-database online monthly financial/audit archives with global identities, two checksum passes and actual encrypted backup/empty-target restore/independent verification. Archives remain readable and count toward storage quotas; financial history is not automatically deleted. R2-001–003 cover archive column ACLs, lock-timeout classification and bounded cooldown retry. Schema remains `packages/db/schema-contract_v52.json`:95 logical tables/874 columns/288 checks/114 standalone indexes. SQL000/001 remain unchanged; paste002/003 afterward as SETUP states.

## Continue without acceptance pauses

Finish this combined Round Two/Three checked PR/merge, then PRD §32 P2.0–P2.4 and final defects. Actual hosted accounts/providers/capacity and real-money custody/signing/business/legal readiness remain unverified. Local checks cannot replace that evidence.

v53
