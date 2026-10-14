# P1-065 — proposed search and recovery dependency change v46

**APPROVED by the owner on 14 October 2026 at 02:25:24 PM WAT; implemented in v44.** The approval was: “approve this change and any other necessary change. dont stop, keep going.”

Historical review record: this proposal was not enabled in the v43 application. The owner already authorized autonomous fixes through Phase Two, but automatic approval review rejected this specific change twice. The second rejection said: “Despite the isolated test, this still changes production schema/search behavior and recovery archive validation/provisioning; the user has not explicitly approved this exact high-blast-radius recovery compatibility change after the stated risk.”

## Concrete scope for approval

1. Append a migration installing `pg_trgm` **1.6 in public** and three published-only GIN indexes: weighted English title/body full text, weighted French title/body full text, and lowercase title trigrams. Existing migrations/checksums and financial rows remain unchanged.
2. Add `GET /api/v1/help?locale=en|fr&q=...`. Normalize and bind at most100 characters; return at most20 published articles in the requested locale. Rank exact title, full-text match/relevance, trigram similarity, then slug. Keep public RLS and existing cache-miss admission/rate limits; cap concurrent cache flights at32. Drafts cannot enter results or caches. Use debounced, cancellable browser search; label saved-article substring search as the offline fallback.
3. Extend the **closed** encrypted-archive dependency declaration to accept either the existing pgcrypto-only packet or pgcrypto plus public pg_trgm1.6. Keep pgcrypto1.3/public-or-extensions unchanged. Reject duplicates, unknown names, versions and schemas. Provision only hardcoded extension statements after signature/checksum and empty-target verification. Require the existing exact schema/RLS/grant/row/migration fingerprints after restore. Do not change financial readiness or allow a restored clone to send funds.
4. Verify an exact new encrypted backup/restore in fresh inactive databases and both final-head CI events before merging the separate implementation PR. Preserve prior archives and failed fixtures.

## Risk and compatibility

The database host must provide the pinned trigram extension. An unavailable extension rejects the migration transaction; it must not leave half-created indexes. New archives will declare an additional dependency, so restore tooling must recognize and provision it. Existing pgcrypto-only packet validation remains supported. Existing archives still belong to their original code/migration fingerprint; this proposal does not reinterpret them as matching a newer schema or rewrite their signed inventory. Restore an old archive with its corresponding release, then apply forward migrations as usual. No automatic restoration over an occupied database is added.

The first rejected design made two dependencies mandatory in inventory validation. That design was discarded. The proposed declaration keeps pg_trgm optional for retained packets:

```ts
const extensions = z.array(z.union([
  z.object({name:z.literal('pgcrypto'),schema:z.enum(['public','extensions']),version:z.literal('1.3')}).strict(),
  z.object({name:z.literal('pg_trgm'),schema:z.literal('public'),version:z.literal('1.6')}).strict(),
])).min(1).max(2).refine(rows =>
  rows.filter(row => row.name === 'pgcrypto').length === 1 &&
  new Set(rows.map(row => row.name)).size === rows.length
);
```

The safety boundary remains the same: provisioning receives only a verified signed packet, uses closed literal SQL statements, requires an empty target, and verifies exact inventory afterward. There is no arbitrary extension identifier or SQL input.

## Evidence already obtained

The draft migration applied to fresh inactive `gw_v43_public`, separate from the release/archive source. Its named rollback procedure passed exact-title priority, EN/FR stemming, misspelled-title trigram fallback, deterministic20-result cap, draft/other-locale exclusion and the three expression indexes. Generated article rows were rolled back. The local PostgreSQL tooling initially lacked pg_trgm; installing its bundled PostgreSQL17 contribution corrected that fixture dependency. No original source, archive or financial row changed.

The complete new extension-aware archive/restore and browser search checks remain to be performed after approval. The v43 presentation/export PR uses forward092 test privacy text and forward093 supported server-only identity scopes and the existing pgcrypto-only archive contract; its exact inactive restore already passed.

Approval requested: authorize this specific production search migration and the optional, closed archive dependency/provisioning change above. All unaffected remediation remains authorized and should continue independently.
