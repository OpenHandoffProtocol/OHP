# 01-hpke-roundtrip (walkthrough)

**Type:** Walkthrough (no real ciphertext in v0.1)
**Tier:** Sealed
**Traces to:** `spec/ohp-0.1.md` §5.3 (HPKE sealing)

## What this vector documents

The complete HPKE sealing flow for a Sealed-tier envelope where the sender encrypts a payment-instruction detail to a single receiver.

## Steps (informative)

1. **Receiver publishes** their HPKE public key in `/.well-known/ohp-jwks.json` with `kid = "rcv_2026_05_x25519"`, `use = "enc"`, `alg = "HPKE/X25519-SHA256-CHACHA20POLY1305"`.
2. **Sender** fetches the JWKS; selects the `enc` key with the right `alg`; includes the `kid` in `audience.recipientKeys[]`.
3. **Sender** computes the canonical CBOR of the plaintext: `{ "payment.disputeDetail": { "txn": "txn_aa12", "merchant": "..." }, "caller.vulnerable": false }`.
4. **Sender** computes `aad` = canonical CBOR of `{ id, issuedAt, audience.did, session.callId }`.
5. **Sender** calls `HPKE.Seal(receiver_pub, aad, plaintext)` → `(enc, ciphertext)`.
6. **Sender** populates `sealed`:
   ```json
   {
     "alg": "HPKE/X25519-SHA256-CHACHA20POLY1305",
     "recipients": [
       { "kid": "rcv_2026_05_x25519", "enc": "<base64url of enc>" }
     ],
     "ciphertext": "<base64url of ciphertext>",
     "fields": ["payment.disputeDetail", "caller.vulnerable"]
   }
   ```
7. **Sender** also sets `sealed.fields` so the receiver can gate on field names without decrypting.
8. **Receiver** runs the verification flow (steps 1–6 of `docs/09-trust-verification.md`).
9. **Receiver** at step 7: finds the matching `kid` in `sealed.recipients[]`, computes `aad`, calls `HPKE.Open(receiver_priv, enc, aad, ciphertext)` → plaintext.
10. **Receiver** discards any sealed entries whose `kid` does not match.

## Status in v0.1

The `envelope.json` is structurally valid but the `enc` and `ciphertext` fields are placeholder strings. v0.2 will ship synthetic X25519 keys and a working sealed-and-opened test vector that the runner can verify end-to-end.

## Files

- `envelope.json` — structurally valid Sealed envelope with placeholder HPKE artefacts.
- `expected.json` — expected receiver outcome (structural-only in v0.1).
