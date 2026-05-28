# 02-prohibited-flag

**Type:** accept-negative
**Tier:** Regulated
**Traces to:** `spec/ohp-0.1.md` §6.2 (governance.prohibited), `docs/09-trust-verification.md` step 8 (prohibited check)

## What this vector proves

A receiver presented with a Regulated-tier envelope where `governance.prohibited.subliminalManipulation = true` (or any other prohibited flag) MUST reject the envelope with `REJECT reason="prohibited-practice"`, regardless of other validity properties.

## Files

- `envelope.json` — Regulated envelope with the `subliminalManipulation` flag asserted `true`.
- `expected.json` — expected receiver outcome.

## Note

In production, the issuer would not normally emit such an envelope; this vector exists to verify that a receiver correctly handles a hostile or buggy sender.
