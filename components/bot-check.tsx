"use client";
import {errorMessage} from "@/lib/error-messages";
import { useEffect, useRef, useState } from "react";
import { mutation, clientSessionMatches, ApiError } from "@/lib/api-client";
import type { Locale } from "@/lib/i18n";
export type BotProof = { challenge_id: string; token: string };
type Challenge = {
  required: boolean;
  provider?: "dummy" | "turnstile";
  challenge_id?: string;
  dummy_token?: string;
  site_key?: string;
  action?: string;
  expires_at?: string;
};
type Turnstile = {
  render(node: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
let flight: Promise<Turnstile> | undefined;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (flight) return flight;
  flight = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.nonce =
      (document.querySelector("script[nonce]") as HTMLScriptElement | null)
        ?.nonce ?? "";
    const timer = setTimeout(() => {
      script.remove();
      reject(new Error("CAPTCHA_UNAVAILABLE"));
    }, 10000);
    script.onload = () => {
      clearTimeout(timer);
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("CAPTCHA_UNAVAILABLE"));
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      reject(new Error("CAPTCHA_UNAVAILABLE"));
    };
    document.head.appendChild(script);
  });
  const current = flight;
  void current.catch(() => {
    if (flight === current) flight = undefined;
  });
  return current;
}
export default function BotCheck({
  owner,
  generation,
  surface,
  locale,
  onReady,
  reset = 0,
}: {
  owner: string;
  generation: string;
  surface: "consent" | "suspicious_checkout";
  locale: Locale;
  onReady: (ready: boolean, proof?: BotProof) => void;
  reset?: number;
}) {
  const [message, setMessage] = useState(""),
    [retry, setRetry] = useState(0),
    node = useRef<HTMLDivElement>(null),
    callback = useRef(onReady),
    version = useRef(0);
  callback.current = onReady;
  useEffect(() => {
    const active = ++version.current;
    let widget: string | undefined,
      timer: ReturnType<typeof setTimeout> | undefined;
    const valid = () =>
      version.current === active && clientSessionMatches(owner, generation);
    callback.current(false);
    setMessage(locale === "fr" ? "Vérification en cours…" : "Checking…");
    void mutation<Challenge>("/me/bot-check", owner, { surface })
      .then(async (result) => {
        if (!valid()) return;
        if (!result.required) {
          setMessage("");
          callback.current(true);
          return;
        }
        const ready = (token: string) => {
          if (valid()) {
            setMessage(
              locale === "fr" ? "Vérification terminée." : "Check complete.",
            );
            callback.current(true, {
              challenge_id: result.challenge_id!,
              token,
            });
          }
        };
        timer = setTimeout(
          () => {
            if (valid()) {
              callback.current(false);
              setMessage(
                locale === "fr"
                  ? "Vérification expirée. Réessayez."
                  : "Check expired. Retry.",
              );
            }
          },
          Math.max(0, Date.parse(result.expires_at!) - Date.now()),
        );
        if (result.provider === "dummy") {
          ready(result.dummy_token!);
          return;
        }
        const provider = await loadTurnstile();
        if (!valid() || !node.current) return;
        widget = provider.render(node.current, {
          sitekey: result.site_key,
          action: result.action,
          cData: result.challenge_id,
          language: locale,
          size: "flexible",
          retry: "never",
          callback: ready,
          "expired-callback": () => {
            if (valid()) {
              callback.current(false);
              setMessage(
                locale === "fr" ? "Vérification expirée." : "Check expired.",
              );
            }
          },
          "error-callback": () => {
            if (valid()) {
              callback.current(false);
              setMessage(
                locale === "fr"
                  ? "Vérification indisponible. Réessayez."
                  : "Check unavailable. Retry.",
              );
            }
            return true;
          },
        });
      })
      .catch((error) => {
        if (valid()) {
          callback.current(false);
          setMessage(
            errorMessage(error, locale),
          );
        }
      });
    return () => {
      version.current++;
      if (timer) clearTimeout(timer);
      if (widget) window.turnstile?.remove(widget);
      callback.current(false);
    };
  }, [owner, generation, surface, reset, retry, locale]);
  return (
    <div className="bot-check">
      <div ref={node} />
      {message && <p role="status">{message}</p>}
      <button type="button" onClick={() => setRetry((v) => v + 1)}>
        {locale === "fr" ? "Relancer la vérification" : "Retry check"}
      </button>
    </div>
  );
}
