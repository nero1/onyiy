import {boundedText} from './request-body';
import crypto from "node:crypto";
import { z } from "zod";
import { workerRequests, withContext } from "@gifters/db";
import { environmentKey, equalText, hash } from "./auth-crypto";
export async function authenticateWorker(request: Request, purpose: string) {
  const url = new URL(request.url),
    timestamp = request.headers.get("x-worker-timestamp") ?? "",
    parsedNonce = z
      .string()
      .uuid()
      .safeParse(request.headers.get("x-worker-nonce")),
    signature = request.headers.get("x-worker-signature") ?? "";
  if (
    request.method !== "POST" ||
    url.search ||
    request.headers.get("content-type")?.split(";")[0] !== "application/json" ||
    !parsedNonce.success ||
    !/^[0-9]{10}$/.test(timestamp) ||
    Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > 300 ||
    request.headers.get("x-worker-environment") !== "testnet" ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  )
    throw new Error("UNAUTHENTICATED");
  const body = await boundedText(request,16384),
    key = environmentKey("FINANCIAL_WORKER_AUTH_KEY");
  let expected: string;
  try {
    expected = crypto
      .createHmac("sha256", key)
      .update(
        [
          "v1",
          "testnet",
          purpose,
          request.method,
          url.pathname,
          timestamp,
          parsedNonce.data,
          hash(body),
        ].join("\n"),
      )
      .digest("base64url");
  } finally {
    key.fill(0);
  }
  if (!equalText(expected, signature)) throw new Error("UNAUTHENTICATED");
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("INVALID_INPUT");
  }
  await withContext({ access: "service" }, async (tx) => {
    const inserted = await tx
      .insert(workerRequests)
      .values({
        nonce: parsedNonce.data,
        environment: "testnet",
        purpose,
        bodyHash: hash(body),
        expiresAt: new Date(Date.now() + 600000),
      })
      .onConflictDoNothing()
      .returning({ nonce: workerRequests.nonce });
    if (!inserted.length) throw new Error("SCHEDULER_REPLAY");
  });
  return parsed;
}
