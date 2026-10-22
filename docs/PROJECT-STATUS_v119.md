# Project status v119

**Phase One/Two is incomplete.** Four mainnets/eight protocols are implemented; seven member currencies have local financial checks. Configured-provider acceptance, hosted operation and observation periods remain. Owner launch inputs are deferred to final testing.

## Remaining tasks

| ID | Next work |
|---|---|
| C001 Mainnet | Finish the enabled-asset edge-case audit and actual provider acceptance. |
| C002 Hosting | Verify shared-database promotion, restricted Preview and hosted permissions. |
| C003 Custody | Verify protected key installation, signer limits and real worker operation. |
| C004 Payments | Complete remaining account-setup, failure, replacement and recovery cases. |
| C005 Asset/RPC review | Verify real contracts/mints, decimals, provenance and independent RPCs. Leave unverified assets disabled. |
| C006 Prices/fees | CoinMarketCap and signed fallback implemented; verify hosted freshness, quota/backoff and fee behavior at final setup. |
| C007 Devices | Finish physical-wallet, mobile, accessibility and update checks. |
| C008 Recovery | Run the chosen hosted incident/restore/closure drills; reconcile unknown transfers without inventing payment intent. |
| C009 Identity | Verify actual Google, CAPTCHA, authenticators and hosted rate limits. |
| C010 Product | Complete the current PRD audit across public/member/admin screens, flags and profile transitions. |
| C011 Operations | Verify received alerts, actual schedules, backup storage/age and monitoring. |
| C012 Capacity | Measure hosted/mobile latency, quotas and operating costs. |
| C013 Observation | Complete actual 14-day beta and 14-day initial-cap mainnet periods. |
| C014 Owner review | At final setup: countries/terms, funding/refund/closure model, custody and budget. |
| C015 Age | Verify hosted eligibility/consent behavior. |
| C016 Preferences | Verify saved language/timezone on target devices and hosting. |
| C017 Schedules | Finish per-currency launch, navigation and operational checks. |

## Current work

PR117 contains the independent audit; PR118 merged its first fixes. The current batch brings the audit to **33 fixed, one open (AUD-021), one withdrawn**. Continue the remaining controller/session/type refactor. See the [audit report](../custom-bugs-report.md).

Continue fixing all reported and newly confirmed bugs without approval pauses. Merge substantial batches only after both final-head CI events pass. Local verification does not replace the outstanding hosted/provider/device acceptance or observation periods.

v119
