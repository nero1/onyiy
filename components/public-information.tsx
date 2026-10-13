"use client";
import { useEffect, useState } from "react";
export default function PublicInformation() {
  const [statements, setStatements] = useState<string[]>([]),
    [seconds, setSeconds] = useState(10),
    [index, setIndex] = useState(0),
    [paused, setPaused] = useState(false),
    [reduced, setReduced] = useState(false),
    [fr, setFr] = useState(false),
    [stats, setStats] = useState<any>(null);
  useEffect(() => {
    let active = true, revision = 0;
    let controller: AbortController | undefined;
    const language = () => setFr(document.documentElement.lang === "fr"),
      observer = new MutationObserver(language);
    language();
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    const motion = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => setReduced(motion.matches);
    change();
    motion.addEventListener("change", change);
    const load = () => {
      if (document.visibilityState !== "visible") return;
      controller?.abort(); controller = new AbortController();
      const current = ++revision, signal = controller.signal;
      void fetch("/api/v1/manifest", { credentials: "omit", signal })
        .then((r) => (r.ok ? r.json() : null))
        .then(async (value) => {
          if (!active || current !== revision || !value) return;
          const data = value.data;
          setStatements(data.feature_activity ? (data.activity_statements ?? []) : []);
          setSeconds(data.ui_rotation_policy?.activity_seconds ?? 10);
          if (!data.public_stats_policy?.enabled) setStats(null);
          if (data.public_stats_policy?.enabled) {
            const response = await fetch("/api/v1/statistics", {
              credentials: "omit", signal,
            });
            if (response.ok) {
              const value = await response.json();
              if (active && current === revision) setStats(value.data);
            }
          }
        })
        .catch(() => {});
    };
    load();
    const refresh = setInterval(load, 60000);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false; controller?.abort(); revision++;
      clearInterval(refresh);
      document.removeEventListener("visibilitychange", load);
      observer.disconnect();
      motion.removeEventListener("change", change);
    };
  }, []);
  useEffect(() => {
    if (paused || reduced || !statements.length) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % statements.length),
      seconds * 1000,
    );
    return () => clearInterval(timer);
  }, [paused, reduced, statements, seconds]);
  return (
    <>
      {statements.length > 0 && (
        <aside className="ticker" aria-label={fr ? "Activité" : "Activity"}>
          <span>{statements[index % statements.length]}</span>
          <button
            aria-pressed={paused || reduced}
            onClick={() => setPaused((p) => !p)}
            disabled={reduced}
          >
            {paused || reduced ? (fr ? "Reprendre" : "Resume") : "Pause"}
          </button>
        </aside>
      )}
      {stats?.enabled && (
        <aside className="public-statistics">
          <span>
            {fr ? "Membres inscrits avec consentement" : "Consented members"}:{" "}
            {stats.consented_members}
          </span>{" "}
          ·{" "}
          <span>
            {fr ? "Inscriptions en attente" : "Pending registrations"}:{" "}
            {stats.pending_registrations}
          </span>{" "}
          ·{" "}
          <span>
            {fr ? "Versements aux membres" : "Settled member payments"}: $
            {String(stats.settled_member_usd).split(".")[0] +
              "." +
              (String(stats.settled_member_usd).split(".")[1] ?? "")
                .padEnd(2, "0")
                .slice(0, 2)}{" "}
            ({stats.environment})
          </span>
          <time dateTime={stats.observed_at}>
            {new Date(stats.observed_at).toLocaleString(fr ? "fr" : "en")}
          </time>
        </aside>
      )}
    </>
  );
}
