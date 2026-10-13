"use client";
import { useState } from "react";
import {
  api,
  privateTransfer,
  ApiError,
  clientSessionMatches,
} from "@/lib/api-client";
import { activeSessionGeneration } from "@/lib/storage";
import type { Locale } from "@/lib/i18n";
export default function PortabilityAdmin({
  owner,
  locale,
  enabled,
}: {
  owner: string;
  locale: Locale;
  enabled: boolean;
}) {
  const fr = locale === "fr",
    [ids, setIds] = useState(""),
    [selected, setSelected] = useState<string[]>([
      "username",
      "locale",
      "status",
    ]),
    [format, setFormat] = useState("json"),
    [reason, setReason] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [status, setStatus] = useState<any>(null),
    [file, setFile] = useState<File | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice(e instanceof ApiError ? e.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }
  async function download(path: string, body: unknown, name: string) {
    const generation = activeSessionGeneration(owner),
      response = await privateTransfer(path, owner, {
        method: "POST",
        body: JSON.stringify(body),
      }),
      blob = await response.blob();
    if (!clientSessionMatches(owner, generation ?? undefined))
      throw new ApiError("VERSION_CONFLICT");
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section>
      <h3>{fr ? "Portabilité des données" : "Data portability"}</h3>
      <button
        disabled={busy}
        onClick={() =>
          void run(async () =>
            setStatus(await api("/admin/portability", owner)),
          )
        }
      >
        {fr ? "Vérifier le snapshot" : "Check snapshot readiness"}
      </button>
      {notice && <p role="alert">{notice}</p>}
      <fieldset disabled={busy || !enabled}>
        <label>
          {fr
            ? "Identifiants utilisateurs (100 maximum)"
            : "User IDs (maximum100)"}
          <textarea value={ids} onChange={(e) => setIds(e.target.value)} />
        </label>
        <div>
          {[
            "username",
            "email",
            "locale",
            "status",
            "role",
            "consent_version",
            "consented_at",
            "created_at",
          ].map((field) => (
            <label key={field}>
              <input
                type="checkbox"
                checked={selected.includes(field)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, field]
                      : selected.filter((f) => f !== field),
                  )
                }
              />
              {field}
            </label>
          ))}
        </div>
        <label>
          {fr ? "Format" : "Format"}
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option>json</option>
            <option>csv</option>
          </select>
        </label>
        <label>
          {fr ? "Motif" : "Reason"}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
        </label>
        <button
          disabled={!selected.length || reason.trim().length < 10}
          onClick={() =>
            void run(() =>
              download(
                "/admin/portability/users",
                {
                  user_ids: ids.split(/[\s,]+/).filter(Boolean),
                  fields: selected,
                  format,
                  reason,
                },
                "selected-users." + format,
              ),
            )
          }
        >
          {fr ? "Exporter les champs sélectionnés" : "Export selected fields"}
        </button>
        <p>
          {fr
            ? "Le snapshot complet est chiffré par l’opérateur. Les secrets de connexion sont reconfigurés séparément."
            : "The operator encrypts the full snapshot. Connection secrets are provisioned separately."}
        </p>
        {status && (
          <p>
            {status.snapshot_available
              ? fr
                ? "Snapshot disponible"
                : "Snapshot available"
              : fr
                ? "Snapshot non configuré"
                : "Snapshot not configured"}{" "}
            · {status.ui_upload_mb} MiB
          </p>
        )}
        <label>
          {fr ? "Confirmation exacte" : "Exact confirmation"}
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
        <button
          disabled={
            !status?.snapshot_available ||
            confirmation !== "download-encrypted-site" ||
            reason.trim().length < 10
          }
          onClick={() =>
            void run(() =>
              download(
                "/admin/portability/site",
                { confirmation, reason },
                "site.gwbackup",
              ),
            )
          }
        >
          {fr
            ? "Télécharger le snapshot chiffré"
            : "Download encrypted site snapshot"}
        </button>
        <label>
          {fr ? "Archive chiffrée à préparer" : "Encrypted archive to stage"}
          <input
            type="file"
            accept=".gwbackup"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <p>
          {fr
            ? "Saisir stage-encrypted-site. La préparation ne restaure ni ne publie le site. L’opérateur valide ensuite le manifeste signé dans une base vide et inactive."
            : "Enter stage-encrypted-site. Staging does not restore or publish the site. The operator then validates the signed inventory in a fresh inactive database."}
        </p>
        <button
          disabled={
            !file ||
            !status ||
            file.size > status.ui_upload_mb * 1048576 ||
            confirmation !== "stage-encrypted-site" ||
            reason.trim().length < 10
          }
          onClick={() =>
            void run(async () => {
              const capturedGeneration = activeSessionGeneration(owner);
              const digest = await crypto.subtle.digest(
                  "SHA-256",
                  await file!.arrayBuffer(),
                ),
                sha = Array.from(new Uint8Array(digest), (v) =>
                  v.toString(16).padStart(2, "0"),
                ).join("");
              if (!clientSessionMatches(owner, capturedGeneration ?? undefined))
                throw new ApiError("VERSION_CONFLICT");
              const response = await privateTransfer(
                "/admin/portability/stage",
                owner,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/octet-stream",
                    "X-Archive-SHA256": sha,
                    "X-Import-Confirmation": confirmation,
                    "X-Import-Reason": encodeURIComponent(reason),
                  },
                  body: file,
                },
              );
              if (!clientSessionMatches(owner, capturedGeneration ?? undefined))
                throw new ApiError("VERSION_CONFLICT");
              const value = await response.json();
              setNotice(value.data.status + " · " + value.data.staging_id);
              setFile(null);
            })
          }
        >
          {fr ? "Préparer l’archive" : "Stage archive"}
        </button>
      </fieldset>
    </section>
  );
}
