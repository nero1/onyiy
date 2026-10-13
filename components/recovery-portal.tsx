"use client";
import { useEffect, useRef, useState } from "react";
import { api, mutation } from "@/lib/api-client";
import type { NativeCurrency } from "@/lib/native-wallet";
export default function RecoveryPortal() {
  const [fr, setFr] = useState(false),
    [data, setData] = useState<{
      statement: string;
      destination: string;
      expires_at: string;
      currency: NativeCurrency;
    } | null>(null),
    [signature, setSignature] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const params = new URLSearchParams(location.hash.slice(1)),
      recovery_id = params.get("id"),
      token = params.get("token");
    history.replaceState(null, "", location.pathname);
    if (!recovery_id || !token) {
      setMessage("Link unavailable · Lien indisponible");
      return;
    }
    void api("/auth/session", "")
      .then(() =>
        mutation<any>("/auth/recovery/statement", "", { recovery_id, token }),
      )
      .then((value) => {
        if (mounted.current) setData(value);
      })
      .catch(() => {
        if (mounted.current)
          setMessage(
            "Link unavailable or expired · Lien indisponible ou expiré",
          );
      });
    return () => {
      mounted.current = false;
    };
  }, []);
  async function prove() {
    if (!data || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (Date.now() >= Date.parse(data.expires_at))
        throw new Error("QUOTE_EXPIRED");
      const wallet = await import("@/lib/native-wallet"),
        address = await wallet.connectNativeWallet(data.currency);
      if (!mounted.current) return;
      if (
        (/^0x[0-9a-f]{40}$/i.test(address)
          ? address.toLowerCase()
          : address) !== (/^0x[0-9a-f]{40}$/i.test(data.destination) ? data.destination.toLowerCase() : data.destination)
      )
        throw new Error("WRONG_WALLET");
      if (Date.now() >= Date.parse(data.expires_at))
        throw new Error("QUOTE_EXPIRED");
      const value = await wallet.signNativeOwnership(
        data.currency,
        address,
        data.statement,
      );
      if (mounted.current && Date.now() < Date.parse(data.expires_at)) {
        setSignature(value);
        setMessage(
          fr
            ? "Transmettez cette approbation au support. Aucun transfert ni accès au compte n’a été accordé."
            : "Give this approval to support. No transfer or account access was granted.",
        );
      }
    } catch {
      if (mounted.current)
        setMessage(
          fr
            ? "Signature non confirmée. Vérifiez le portefeuille sélectionné."
            : "Signature not confirmed. Check the selected wallet.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  useEffect(() => {
    document.documentElement.lang = fr ? "fr" : "en";
  }, [fr]);
  return (
    <main className="app account-portal">
      <nav>
        <a href="/">Gifters World</a>
        <a href="/help">{fr ? "Aide" : "Help"}</a>
        <button onClick={() => setFr((v) => !v)}>{fr ? "FR" : "EN"}</button>
      </nav>
      <h1>{fr ? "Récupération du solde" : "Balance recovery"}</h1>
      <p>
        {fr
          ? "Vérifiez les montants et le portefeuille d’origine avant de signer. Cette approbation ne rétablit pas l’accès au compte."
          : "Review the amounts and original wallet before signing. This approval does not restore account access."}
      </p>
      <p role="status">{message}</p>
      {data && (
        <section className="card">
          <pre className="recovery-statement">{data.statement}</pre>
          <button
            disabled={busy || !navigator.onLine}
            onClick={() => void prove()}
          >
            {fr
              ? "Signer avec le portefeuille d’origine"
              : "Sign with original wallet"}
          </button>
          {signature && (
            <>
              <textarea
                readOnly
                aria-label={fr ? "Approbation signée" : "Signed approval"}
                value={signature}
              />
              <button
                onClick={() =>
                  void navigator.clipboard
                    .writeText(signature)
                    .catch(() =>
                      setMessage(
                        fr
                          ? "Sélectionnez et copiez l’approbation ci-dessus."
                          : "Select and copy the approval above.",
                      ),
                    )
                }
              >
                {fr ? "Copier l’approbation" : "Copy approval"}
              </button>
            </>
          )}
        </section>
      )}
    </main>
  );
}
