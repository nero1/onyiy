import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { outbox, type DbExecutor } from "@gifters/db";
import { validateRuntimeEnv } from "@gifters/config";
export const observationPayload = z
  .object({
    user_id: z.string().uuid(),
    invoice_id: z.string().uuid(),
    tx_hash: z.string().min(20).max(128),
    event_index: z.number().int().min(-1).max(1000),
    round: z.number().int().min(0).max(2880),
  })
  .strict();
export async function enqueueObservation(
  tx: DbExecutor,
  input: z.infer<typeof observationPayload>,
) {
  const parsed = observationPayload.parse(input),
    key = `chain-observe:${parsed.invoice_id}:${parsed.tx_hash}:${parsed.event_index}:${parsed.round}`,
    environment = validateRuntimeEnv().appEnv;
  const inserted = await tx
    .insert(outbox)
    .values({
      businessKey: key,
      environment,
      kind: "chain_observation",
      payload: parsed,
    })
    .onConflictDoNothing()
    .returning({ id: outbox.id });
  if (!inserted.length) {
    const [old] = await tx
      .select()
      .from(outbox)
      .where(eq(outbox.businessKey, key))
      .limit(1);
    const saved = observationPayload.safeParse(old?.payload);
    if (
      !saved.success ||
      old.kind !== "chain_observation" ||
      old.environment !== environment ||
      JSON.stringify(saved.data) !== JSON.stringify(parsed)
    )
      throw new Error("VERSION_CONFLICT");
  }
}
