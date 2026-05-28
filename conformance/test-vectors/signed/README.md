# Signed-tier conformance vectors

Vectors in this directory exercise the **detached Ed25519 JWS over canonical CBOR** added at the Signed tier.

## Vectors shipping in v0.1

| Dir | Type | Tests |
| --- | --- | --- |
| [`01-valid-jws/`](./01-valid-jws/) | accept-positive | A correctly signed envelope verifies and is accepted. (Placeholder signature in v0.1.) |

## Planned for v0.2

- `02-tampered-payload/` — accept-negative, byte change after signing causes `signature-invalid`.
- `03-revoked-kid/` — accept-negative, `kid` no longer in issuer JWKS.
- `04-canonicalisation-divergence/` — accept-negative, sender did not canonicalise CBOR per §5.2 rules.
- `05-emit-positive-jwks-publish/` — emit-positive, sender's `/.well-known/ohp-jwks.json` matches the `kid` it signs with.

See [`../README.md`](../README.md) for vector anatomy.

## Synthetic keys

`keys/` directories will contain synthetic Ed25519 key pairs in JWK format. Vectors generated in v0.2 will include actual signatures over the canonical CBOR.
