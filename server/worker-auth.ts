import {boundedText} from './request-body';
import {nativePaymentEnvironment} from "@gifters/config";
import {financialWorkerSignature} from "../packages/config/src/worker-signature.mjs";
import { z } from "zod";
import { workerRequests, withContext } from "@gifters/db";
import { environmentKey, equalText, hash } from "./auth-crypto";
export async function authenticateWorker(request: Request, purpose: string) {
  let environment:"testnet"|"mainnet";
  try{environment=nativePaymentEnvironment()}catch{throw new Error("UNAUTHENTICATED")}
  const url = new URL(request.url),
    timestamp = request.headers.get("x-worker-timestamp") ?? "",
    parsedNonce = z
      .string()
      .uuid()
      .safeParse(request.headers.get("x-worker-nonce")),
    signature = request.headers.get("x-worker-signature") ?? "";
  if (
    request.method !== "POST" ||
    url.search || url.pathname!=="/api/v1/internal/financial" || purpose!=="financial" ||
    request.headers.get("content-type")?.split(";")[0] !== "application/json" ||
    !parsedNonce.success ||
    !/^[0-9]{10}$/.test(timestamp) ||
    Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > 300 ||
    request.headers.get("x-worker-environment") !== environment ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  )
    throw new Error("UNAUTHENTICATED");
  const body = await boundedText(request,16384),
    key = environmentKey("FINANCIAL_WORKER_AUTH_KEY");
  let expected: string;
  try {
    expected=financialWorkerSignature({environment,purpose:'financial',method:'POST',path:'/api/v1/internal/financial',timestamp,nonce:parsedNonce.data,bodyHash:hash(body)},key);
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
        environment,
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
