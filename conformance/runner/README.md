# Conformance test runner

The reference conformance test runner is **not shipping in v0.1**. This README tracks the intended scope and acceptance criteria.

## v0.2 target

The reference runner will:

1. Walk `conformance/test-vectors/`.
2. For each vector:
   - Validate `envelope.json` against `schemas/ohp-envelope.schema.json`.
   - If `keys/` is present, perform real cryptographic operations (Ed25519 verify, ML-DSA-65 verify, HPKE open).
   - Execute the receiver-side verification flow in `docs/09-trust-verification.md`.
   - Compare outcome to `expected.json`.
3. Emit a structured report (`results/<tier>/<vector>.json`).
4. Exit non-zero if any vector under the implementation's claimed tier fails.

## Intended interface

```bash
# Run the suite against the local schemas only (no implementation under test):
ohp-conformance --tier sealed --self-check

# Run the suite against an implementation under test (sender mode):
ohp-conformance --tier sealed --emit \
  --emit-endpoint https://impl.example.com/ohp/v1/issue \
  --auth-token "$IMPL_TOKEN"

# Run the suite against an implementation under test (receiver mode):
ohp-conformance --tier sealed --accept \
  --accept-endpoint https://impl.example.com/ohp/v1/transfer
```

## Language / dependencies

To be decided by the WG before v0.2. Strong candidates:

- **Python** with `pyjwt`, `cryptography`, `cbor2`, `jsonschema`, `requests`. Pros: lowest setup friction. Cons: ML-DSA support requires native extension.
- **Rust** with `ring`, `serde_json`, `serde_cbor`. Pros: PQ crypto via `pqcrypto` crate, deterministic builds. Cons: higher barrier to contribution.

A discussion issue will be opened on the GitHub tracker before any implementation work begins.

## Out of scope for the runner

- Network reachability testing
- Load / stress testing
- Implementation-specific behaviour beyond the spec
- Tier "fuzziness" — the runner enforces a strict pass/fail at the declared tier

## Open issues

| Topic | Decision needed by |
| --- | --- |
| Language / dependency choice | v0.2 |
| How to handle deterministic synthetic key generation across vectors | v0.2 |
| How to capture timing budgets (e.g. "verification < 60 ms") as conformance assertions | v0.3 |
| Whether to publish the runner as a Docker image | v0.2 |
