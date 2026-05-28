# Sealed-tier conformance vectors

Vectors in this directory exercise HPKE per-recipient sealing, SD-JWT VC identity, ISO/IEC 27560 consent receipts, DPoP binding, and RTP fingerprint binding added at the Sealed tier.

## Vectors shipping in v0.1

Structural placeholders only. Comprehensive Sealed-tier vectors land in v0.2.

| Dir | Type | Tests |
| --- | --- | --- |
| [`01-hpke-roundtrip/`](./01-hpke-roundtrip/) | walkthrough | Documents the HPKE recipient/sender flow. No real ciphertext in v0.1. |

## Planned for v0.2

- `02-rtp-fingerprint-mismatch/` — accept-negative, `not-bound-to-call`.
- `03-consent-out-of-scope/` — accept-negative, receiver's intended purpose exceeds receipt.
- `04-sd-jwt-claim-tampered/` — accept-negative, disclosure does not match digest.
- `05-emit-positive-selective-disclosure/` — emit-positive, sender reveals only claims permitted by audience purpose.
- `06-emit-negative-pii-into-non-sealed/` — emit-negative, refuses to put PII in a non-sealed slot.

See [`../README.md`](../README.md) for vector anatomy.
