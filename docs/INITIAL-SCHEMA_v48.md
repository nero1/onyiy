# Single final-state initial schema

The owner confirmed the intended installation has no applied migrations. The active migration directory now contains only [000_initial_schema.sql](../packages/db/src/migrations/000_initial_schema.sql). It creates the final tables, columns, constraints, indexes, views, functions, triggers, RLS policies and grants directly. The old99-step upgrade sequence and historical data backfills are not part of this file.

## Install

Use the schema-owner connection against an empty application namespace. Existing supported extensions in `public`/`extensions` are checked; provider schemas such as `auth` remain separate. The owner must be able to provision the three restricted application groups and the pinned extensions, or have them safely provisioned first.

Recommended command, with the deployment environment configured as described in [SETUP.md](SETUP.md):

```bash
npm run db:migrate
npm run db:seed
npm run db:check:runtime
```

Alternatively, run the entire SQL file once in the provider's owner SQL editor, or use PostgreSQL tooling:

```bash
psql "$DATABASE_MIGRATION_URL" -X -v ON_ERROR_STOP=1 \
  -f packages/db/src/migrations/000_initial_schema.sql
npm run db:seed
npm run db:check:runtime
```

For `psql`, use an owner URI with `sslmode=verify-full` and the correct trusted CA/system trust; do not weaken TLS verification. Never paste credentials into a committed command. The file contains its own transaction and baseline receipt. Direct execution and the CLI produce the same history; a later `db:migrate` skips that matching receipt. Direct SQL itself is intentionally a one-time installer and rejects a nonempty application schema.

`db:check:binding` can also run before installation after the restricted groups/runtime login are provisioned. Its fresh128-bit owner/runtime lock challenge creates no tables and leaves no persistent proof, so it does not require a second migration.

## Contents and verification

The final schema contains92 tables,848 columns,274 CHECK constraints and105 standalone indexes, with all final views, functions, triggers, deferred constraints and grants. Final ACL normalization removes broad target-owner defaults before restoring the reviewed application/column/function permissions. Browser/Data API roles receive no application-table access. Fresh identity rows and known-empty ledger counter coverage are initialized; application manifest/catalog/account seeds remain a separate step. The two published test privacy notices remain available as before.

A new isolated reference database applied the old99 migrations only to establish the expected final catalog. Direct SQL, CLI installation and a target with broad browser/unknown-role default grants matched all3523 schema/security entries and column grants. Named procedures also check receipt tampering, reruns, atomic rollback, nonempty-schema preservation, wrong-database/unsafe-runtime rejection, seed/runtime behavior and an encrypted backup/exact restore. These are migration-specific isolated checks, not hosted acceptance or the deferred broad application test suite.

The receipt hashes every byte before its generated footer. The CLI validates the entire fixed footer and checksum before use; backup fingerprints use the same receipt. Edit neither the baseline nor its receipt after it has been applied. Add a new forward migration for later changes.

## Historical installations and archives

The old files remain in Git history at commit `e6f7888034afae01d0c7803965f1c17889783171`. This is a fresh-install consolidation, not an upgrade for databases carrying that old history. The CLI refuses unknown/legacy migration receipts, and the SQL refuses existing application objects. Nothing is dropped or silently adopted. Use the matching historical release to verify/restore its archives; the signed archive version checks remain intact. Existing private source databases, failed fixtures, original archives, keys and signed evidence are preserved.

This task does not resume P1-009/P1-028, Round Two or Phase Two. Both financial readiness gates remain disabled.

Native exports include every application table's schema, including the historical binding-proof table, while omitting its transient data. Restore requires an empty target and creates no preliminary proof table. The final isolated encrypted archive restored exactly; earlier draft verification failures are retained separately.
