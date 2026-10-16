import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { users, auditEvents, readManifest, type DbExecutor } from "@gifters/db";
import { migrationFingerprint, schemaContractVersion } from "../packages/db/src/recovery-inventory";
const fields = [
  "username",
  "email",
  "locale",
  "status",
  "role",
  "consent_version",
  "consented_at",
  "created_at",
] as const;
export const selectedExportInput = z
  .object({
    user_ids: z.array(z.string().uuid()).min(1).max(100),
    fields: z.array(z.enum(fields)).min(1).max(fields.length),
    format: z.enum(["json", "csv"]),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
export async function selectedUserExport(
  tx: DbExecutor,
  actorId: string,
  input: z.infer<typeof selectedExportInput>,
) {
  if (!(await readManifest(tx)).feature_portability)
    throw new Error("FEATURE_DISABLED");
  const ids = [...new Set(input.user_ids)],
    selected = [...new Set(input.fields)];
  const rows = await tx
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      locale: users.locale,
      status: users.status,
      role: users.role,
      consent_version: users.consentVersion,
      consented_at: users.consentedAt,
      created_at: users.createdAt,
    })
    .from(users)
    .where(inArray(users.id, ids))
    .limit(100);
  if (rows.length !== ids.length) throw new Error("NOT_FOUND");
  const projected = rows.map((row) =>
    Object.fromEntries(
      ["id", ...selected].map((field) => [
        field,
        row[field as keyof typeof row],
      ]),
    ),
  );
  const columns = ["id", ...selected];
  const cell = (value: unknown) =>
    '"' +
    String(value instanceof Date ? value.toISOString() : (value ?? ""))
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const body =
    input.format === "json"
      ? JSON.stringify({ fields: columns, users: projected })
      : [
          columns.map(cell).join(","),
          ...projected.map((row) =>
            columns.map((field) => cell(row[field])).join(","),
          ),
        ].join("\r\n");
  if (Buffer.byteLength(body) > 262144)
    throw new Error("EXPORT_LIMIT_EXCEEDED");
  await tx.insert(auditEvents).values({
    actorUserId: actorId,
    action: "portability.selected.export",
    targetType: "user_export",
    reason: input.reason,
    afterState: { users: ids, fields: selected, format: input.format },
  });
  return new Response(body, {
    headers: {
      "Content-Type":
        input.format === "json"
          ? "application/json"
          : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="selected-users.${input.format}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
/** Owner-produced encrypted artifacts only. The web process never invokes an
 * owner connection, decrypts financial snapshots, restores DBs or starts work. */
export function sitePortabilityMode() {
  // Ephemeral serverless filesystems cannot provide private cross-instance
  // inventory/retrieval. An explicit persistent operator host is required.
  return process.env.VERCEL !== '1' && process.env.SITE_PORTABILITY_MODE === 'persistent_host'
    ? 'persistent_host' as const : 'owner_cli' as const;
}
async function archive(tx: DbExecutor) {
  const policy = await readManifest(tx);
  if (!policy.feature_portability) throw new Error("FEATURE_DISABLED");
  if (sitePortabilityMode() === "owner_cli") return null;
  const file = process.env.SITE_BACKUP_FILE,
    expected = process.env.SITE_BACKUP_SHA256;
  if (!file || !expected) return null;
  if (
    !path.isAbsolute(file) ||
    !file.endsWith(".gwbackup") ||
    !/^[a-f0-9]{64}$/.test(expected)
  )
    throw new Error("RECOVERY_INPUT_INVALID");
  const info = await fsp.lstat(file);
  if (
    !info.isFile() ||
    (info.mode & 0o077) !== 0 ||
    info.size < 37 ||
    info.size > policy.export_import_limits.upload_mb * 1048576
  )
    throw new Error("EXPORT_LIMIT_EXCEEDED");
  const metadata = await fsp.lstat(file + ".json");
  if (
    !metadata.isFile() ||
    (metadata.mode & 0o077) !== 0 ||
    metadata.size > 1048576
  )
    throw new Error("RECOVERY_INPUT_INVALID");
  const packet = JSON.parse(await fsp.readFile(file + ".json", "utf8"));
  if (
    packet.inventory?.archive_sha256 !== expected ||
    packet.inventory?.schema_contract_version !== schemaContractVersion ||
    packet.inventory?.environment !== process.env.APP_ENV ||
    packet.inventory?.migrations_sha256 !== (await migrationFingerprint())
  )
    throw new Error("RECOVERY_VERSION_MISMATCH");
  return {
    file,
    expected,
    bytes: info.size,
    created_at: packet.inventory.created_at,
  };
}
export async function portabilityStatus(tx: DbExecutor) {
  const item = await archive(tx);
  return {
    snapshot_available: !!item,
    ...(item
      ? {
          bytes: item.bytes,
          sha256: item.expected,
          created_at: item.created_at,
        }
      : {}),
    site_mode: sitePortabilityMode(),
    staging_available: sitePortabilityMode() === 'persistent_host' && !!process.env.SITE_IMPORT_STAGING_DIR,
    ui_upload_mb: sitePortabilityMode() === 'persistent_host' ? (await readManifest(tx)).export_import_limits.upload_mb : 0,
    quarantine: sitePortabilityMode() === 'persistent_host' ? await stagingInventory(tx) : [],
    import_policy: "fresh_inactive_database",
    cli_required_above_cap: true,
  };
}
export async function prepareSiteSnapshot(
  tx: DbExecutor, actorId: string, reason: string,
) {
  const item = await archive(tx);
  if (!item) throw new Error("RECOVERY_UNAVAILABLE");
  const handle = await fsp.open(item.file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size !== item.bytes || (info.mode & 0o077) !== 0)
      throw new Error("RECOVERY_CONTENT_MISMATCH");
    // Capture bounded immutable encrypted bytes and close the descriptor before
    // the completion/session fence. No response stream exists until commit.
    const bytes = Buffer.alloc(item.bytes);
    let offset = 0;
    while (offset < bytes.length) {
      const part = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (!part.bytesRead) throw new Error("RECOVERY_CONTENT_MISMATCH");
      offset += part.bytesRead;
    }
    const after = await handle.stat();
    if (after.size !== info.size || after.mtimeMs !== info.mtimeMs ||
        crypto.createHash('sha256').update(bytes).digest('hex') !== item.expected)
      throw new Error("RECOVERY_CONTENT_MISMATCH");
    await tx.insert(auditEvents).values({
      actorUserId: actorId, action: "portability.site.export",
      targetType: "site_snapshot", reason,
      afterState: { sha256: item.expected, bytes: item.bytes },
    });
    return { bytes, sha256: item.expected };
  } finally { await handle.close(); }
}
export function siteSnapshotResponse(snapshot: Awaited<ReturnType<typeof prepareSiteSnapshot>>) {
  return new Response(new Uint8Array(snapshot.bytes), { headers: {
    "Content-Type": "application/octet-stream",
    "Content-Length": String(snapshot.bytes.length),
    "Content-Disposition": 'attachment; filename="site.gwbackup"',
    "Cache-Control": "private, no-store",
    "X-Archive-SHA256": snapshot.sha256,
  } });
}
async function stagingInventory(tx: DbExecutor) {
  const folder = process.env.SITE_IMPORT_STAGING_DIR;
  if (!folder || !path.isAbsolute(folder)) return [];
  const directory = await fsp.lstat(folder);
  if (!directory.isDirectory() || (directory.mode & 0o077) !== 0) throw new Error('RECOVERY_INPUT_INVALID');
  const results: Array<{ staging_id: string; bytes: number; state: string; failure_code: string | null; created_at: string }> = [];
  const contents = await fsp.opendir(folder);
  let count = 0;
  for await (const entry of contents) {
    if (++count > 100) throw new Error('EXPORT_LIMIT_EXCEEDED');
    if (!/^[0-9a-f-]{36}\.gwbackup$/.test(entry.name)) continue;
    const file = path.join(folder, entry.name), info = await fsp.lstat(file);
    if (!info.isFile() || (info.mode & 0o077) !== 0) throw new Error('RECOVERY_INPUT_INVALID');
    let record: any = null;
    try {
      const metadata = await fsp.lstat(file + '.json');
      if (metadata.isFile() && (metadata.mode & 0o077) === 0 && metadata.size <= 4096)
        record = JSON.parse(await fsp.readFile(file + '.json', 'utf8'));
    } catch { /* Missing sidecar remains visible as quarantine evidence. */ }
    const state = record?.state === 'encrypted_unverified' ? 'encrypted_unverified' : 'quarantine';
    results.push({ staging_id: entry.name.slice(0, -9), bytes: info.size, state,
      failure_code: typeof record?.failure_code === 'string' && /^[A-Z_]{1,100}$/.test(record.failure_code) ? record.failure_code : (state === 'quarantine' ? 'METADATA_MISSING' : null),
      created_at: info.birthtime.toISOString() });
  }
  if (results.length) {
    const committed = await tx.select({id:auditEvents.targetId}).from(auditEvents).where(sql`${auditEvents.action}='portability.import.stage' and ${inArray(auditEvents.targetId,results.map(row=>row.staging_id))}`).limit(100);
    const accepted = new Set(committed.map(row=>row.id));
    for (const row of results) if (row.state === 'encrypted_unverified' && !accepted.has(row.staging_id)) {
      row.state = 'quarantine'; row.failure_code = 'AUTHORIZATION_NOT_COMMITTED';
    }
  }
  return results.sort((a,b)=>b.created_at.localeCompare(a.created_at));
}
export async function stageSnapshot(
  tx: DbExecutor,
  actorId: string,
  request: Request,
) {
  const policy = await readManifest(tx);
  if (!policy.feature_portability) throw new Error("FEATURE_DISABLED");
  if (sitePortabilityMode() !== "persistent_host") throw new Error("RECOVERY_UNAVAILABLE");
  const folder = process.env.SITE_IMPORT_STAGING_DIR,
    expected = request.headers.get("x-archive-sha256"),
    reason = decodeURIComponent(request.headers.get("x-import-reason") ?? "");
  if (!folder || !path.isAbsolute(folder))
    throw new Error("RECOVERY_UNAVAILABLE");
  if (
    request.headers.get("x-import-confirmation") !== "stage-encrypted-site" ||
    !expected ||
    !/^[a-f0-9]{64}$/.test(expected) ||
    reason.trim().length < 10 ||
    reason.length > 500 ||
    request.headers.get("content-type") !== "application/octet-stream"
  )
    throw new Error("INVALID_INPUT");
  const directory = await fsp.lstat(folder);
  if (!directory.isDirectory() || (directory.mode & 0o077) !== 0)
    throw new Error("RECOVERY_INPUT_INVALID");
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended('portability-staging-budget',0))`,
  );
  let stored = 0,
    entries = 0;
  const contents = await fsp.opendir(folder);
  for await (const entry of contents) {
    if (++entries > 100) throw new Error("EXPORT_LIMIT_EXCEEDED");
    const info = await fsp.lstat(path.join(folder, entry.name));
    if (info.isFile()) stored += info.size;
    if (stored >= 2 * policy.export_import_limits.upload_mb * 1048576)
      throw new Error("EXPORT_LIMIT_EXCEEDED");
  }
  const declared = request.headers.get("content-length");
  if (
    declared &&
    (!/^[0-9]+$/.test(declared) ||
      BigInt(declared) >
        BigInt(policy.export_import_limits.upload_mb * 1048576))
  )
    throw new Error("EXPORT_LIMIT_EXCEEDED");
  const id = crypto.randomUUID(),
    file = path.join(folder, id + ".gwbackup"),
    handle = await fsp.open(file, "wx", 0o600),
    reader = request.body?.getReader(),
    digest = crypto.createHash("sha256");
  const deadline = Date.now() + 30000;
  let bytes = 0,
    header = Buffer.alloc(0);
  let state = "quarantine", failureCode = "INVALID_INPUT";
  try {
    if (!reader) throw new Error("INVALID_INPUT");
    while (true) {
      if (Date.now() > deadline) {
        void reader.cancel().catch(() => {});
        throw new Error("EXPORT_LIMIT_EXCEEDED");
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      let part: ReadableStreamReadResult<Uint8Array>;
      try {
        part = await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error("EXPORT_LIMIT_EXCEEDED")),
              Math.max(1, deadline - Date.now()),
            );
          }),
        ]);
      } catch (error) {
        void reader.cancel().catch(() => {});
        throw error;
      } finally {
        if (timer) clearTimeout(timer);
      }
      if (part.done) break;
      bytes += part.value.byteLength;
      if (
        bytes > policy.export_import_limits.upload_mb * 1048576 ||
        stored + bytes > 2 * policy.export_import_limits.upload_mb * 1048576
      ) {
        void reader.cancel().catch(() => {});
        throw new Error("EXPORT_LIMIT_EXCEEDED");
      }
      if (header.length < 37)
        header = Buffer.concat([header, Buffer.from(part.value)]).subarray(
          0,
          37,
        );
      digest.update(part.value);
      await handle.writeFile(part.value);
    }
    await handle.sync();
    if (
      bytes < 37 ||
      !header.subarray(0, 9).equals(Buffer.from("GWBACKUP1")) ||
      digest.digest("hex") !== expected
    )
      throw new Error("RECOVERY_CONTENT_MISMATCH");
    await tx.insert(auditEvents).values({
      actorUserId: actorId,
      action: "portability.import.stage",
      targetType: "staged_snapshot",
      targetId: id,
      reason,
      afterState: { sha256: expected, bytes, state: "encrypted_unverified" },
    });
    state = "encrypted_unverified";
    return {
      staging_id: id,
      bytes,
      sha256: expected,
      status: "encrypted_unverified",
      requires: "signed_inventory_and_owner_cli_fresh_target",
    };
  } catch (error) {
    failureCode = error instanceof Error && ['INVALID_INPUT','EXPORT_LIMIT_EXCEEDED','RECOVERY_CONTENT_MISMATCH'].includes(error.message) ? error.message : 'STAGING_FAILED';
    throw error;
  } finally {
    if(reader){void reader.cancel().catch(()=>{});reader.releaseLock();}
    await handle.close();
    // Sidecar is independent of the transaction: rollback cannot hide retained
    // partial evidence. A missing sidecar is also inventoried, never erased.
    await fsp.writeFile(file + '.json', JSON.stringify({schema:'gw-staging-v1',staging_id:id,state,bytes,expected_sha256:expected,failure_code:state==='quarantine'?failureCode:null,observed_at:new Date().toISOString()}), { flag:'wx',mode:0o600 });
  }
}
