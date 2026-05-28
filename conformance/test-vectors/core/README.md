# Core-tier conformance vectors

Vectors in this directory are the **mandatory floor** for any OHP implementation. An implementation claiming OHP-Core MUST pass every vector here. Higher tiers also MUST pass these vectors.

## Vectors shipping in v0.1

| Dir | Type | Tests |
| --- | --- | --- |
| [`01-minimal-valid/`](./01-minimal-valid/) | accept-positive | The minimum mandatory field set must validate against the schema and pass freshness + tier-gate checks. |
| [`02-stale-envelope/`](./02-stale-envelope/) | accept-negative | An envelope whose `notAfter` is in the past is rejected with `reason=stale`. |

## Planned for v0.2

- `03-missing-id/` — accept-negative, rejected at schema validation.
- `04-tier-mismatch/` — accept-negative, sender declares `audience.minTier="signed"` but envelope is `core`.
- `05-emit-refuses-pii/` — emit-negative, sender refuses to emit Core when workload requires AAL2 identity.
- `06-control-verb-mismatch/` — accept-negative, transport `OHP-Verb` header does not match `control.verb`.

See [`../README.md`](../README.md) for the vector anatomy.
