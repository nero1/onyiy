import {z} from 'zod';
const decimal = z
  .string()
  .max(100)
  .regex(/^(0|[1-9][0-9]*)(\.[0-9]{1,18})?$/);
export const signedPrice = z
  .object({
    version: z.literal(1),
    environment: z.enum(["testnet","mainnet"]),
    asset_key: z.string().max(30),
    network: z.string().max(100),
    asset_usd: decimal,
    native_usd: decimal,
    observed_at: z.string().datetime(),
    expires_at: z.string().datetime(),
    source: z
      .string()
      .url()
      .refine((v) =>
        (() => {
          const u = new URL(v);
          return (
            u.protocol === "https:" && !u.username && !u.password && !u.search
          );
        })(),
      ),
  })
  .strict();
export const signedPriceInput = z
  .object({
    document: signedPrice,
    signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
  })
  .strict();

export type SignedPriceDocument=z.infer<typeof signedPrice>;
