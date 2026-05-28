# 01-full-structural

**Type:** structural validity
**Tier:** Regulated
**Traces to:** `spec/ohp-0.1.md` §4.2 (mandatory field table), §6 (AI governance metadata)

## What this vector proves

A complete Regulated-tier envelope with `aiSystem`, `governance` (including `aiia`, `fria`, `prohibited`, `art50Disclosure`, `art86Explanation`), `oversight`, `decisions[]`, `transparency`, and **both** signature entries (Ed25519 + ML-DSA-65) validates against the JSON Schema.

## Status in v0.1

Structural validation only — signatures, transparency leaf hash, and SD-JWT VC are placeholders. A v0.1 runner SHOULD validate that the envelope:

1. Matches the JSON Schema.
2. Has `conformance = "regulated"`.
3. Contains both `EdDSA` and `ML-DSA-65` entries in `signatures[]`.
4. Has all Regulated-tier required blocks present and non-empty.

## Files

- `envelope.json` — a copy of [`../../../../examples/envelopes/04-regulated-healthcare.json`](../../../../examples/envelopes/04-regulated-healthcare.json) but with fixed test fixture IDs.
- `expected.json` — expected receiver outcome.
