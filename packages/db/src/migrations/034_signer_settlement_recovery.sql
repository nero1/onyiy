-- A worker crash after ledger commit still permits known-attempt status repair.
ALTER POLICY signer_obligations ON public.crypto_obligations USING(environment='testnet' AND status IN ('approved','signing','broadcast','awaiting_requote','exception','settled'));
