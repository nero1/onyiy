# Project status v106

**Phase One/Two is incomplete.** Four mainnets/eight protocols are implemented; seven member currencies have local financial checks. Configured-provider acceptance, hosted operation and observation periods remain. Owner launch inputs are deferred to final testing.

## Remaining tasks

| ID | Next work |
|---|---|
| C001 Mainnet | Finish the enabled-asset edge-case audit and actual provider acceptance. |
| C002 Hosting | Verify shared-database promotion, restricted Preview and hosted permissions. |
| C003 Custody | Verify protected key installation, signer limits and real worker operation. |
| C004 Payments | Complete remaining account-setup, failure, replacement and recovery cases. |
| C005 Asset/RPC review | Verify real contracts/mints, decimals, provenance and independent RPCs. Leave unverified assets disabled. |
| C006 Prices/fees | Verify the chosen signed feed and remaining price/cost cases. |
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

Documentation cleanup is merged in [PR104](https://github.com/nero1/onyiy/pull/104); SETUP remains detailed. C010 publication consent, suspension/restoration and activity off/on pass locally across separate processes with unchanged finances. No new bug was found. Continue the remaining product/technical audit; actual provider/hosted acceptance remains open.

Create and merge substantial batches after both CI events pass the exact final head. Continue without milestone approval pauses. Never treat local checks, configuration or fixed-bug counts as 100% production acceptance.

v106
