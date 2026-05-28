# 01-valid-jws

**Type:** accept-positive (placeholder)
**Tier:** Signed
**Traces to:** `spec/ohp-0.1.md` §5.1 (signatures), §5.2 (canonical CBOR)

## What this vector proves

An envelope at the Signed tier with a valid detached Ed25519 JWS over its canonical CBOR is accepted by a Signed-tier receiver.

## Status in v0.1

This vector ships as a **structural** placeholder. The `envelope.json` is structurally valid but its `signatures[0].jws` is a placeholder string, not an actual cryptographic signature. The v0.2 release will ship synthetic Ed25519 keys in `keys/` and a real signature computed against them.

A v0.1 test runner SHOULD validate:

1. The envelope satisfies the JSON Schema.
2. The envelope declares `conformance = "signed"`.
3. The envelope contains a `signatures[]` array with at least one entry of `alg = "EdDSA"`.

A v0.1 test runner MAY skip actual signature verification with a warning, marking the vector as "structurally passed; signature verification deferred to v0.2".

## Files

- `envelope.json` — envelope with placeholder signature.
- `expected.json` — expected outcome.
