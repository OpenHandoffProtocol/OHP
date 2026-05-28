# Regulated-tier conformance vectors

Vectors in this directory exercise the AI governance metadata and the hybrid post-quantum signature scheme added at the Regulated tier.

## Vectors shipping in v0.1

| Dir | Type | Tests |
| --- | --- | --- |
| [`01-full-structural/`](./01-full-structural/) | structural | A complete Regulated envelope with all required governance blocks validates against the schema. |
| [`02-prohibited-flag/`](./02-prohibited-flag/) | accept-negative | An envelope with `governance.prohibited.subliminalManipulation = true` is rejected with `reason=prohibited-practice`. |

## Planned for v0.2

- `03-art50-disclosure-missing/` — accept-negative, receiver MUST refuse if `art50Disclosure.disclosed=false` and the channel reaches a natural person.
- `04-oversight-mode-insufficient/` — accept-negative, receiver policy requires `human-in-the-loop` but envelope says `on-the-loop`.
- `05-gpai-systemic-no-policy/` — accept-negative, `aiSystem.gpaiChain[].systemicRisk=true` without resolvable `policyUrl`.
- `06-stale-aiia/` — accept-negative, `governance.aiia.lastReviewedAt` > 12 months old.
- `07-annex-iii-not-allowlisted/` — accept-negative, `aiSystem.annexIIIClause` outside receiver's allowlist.
- `08-hybrid-pq-sig-roundtrip/` — accept-positive, both Ed25519 + ML-DSA-65 signatures verify.
- `09-incident-verb/` — emit-positive, INCIDENT envelope emitted with Art 73 incident category.

See [`../README.md`](../README.md) for vector anatomy.
