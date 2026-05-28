# OHP Conformance suite

This directory contains the conformance test vectors and (in future versions) the test runner used to verify that an OHP implementation correctly emits and accepts envelopes for its claimed tier.

## What is conformance?

An implementation claiming `OHP-Core` MUST pass every vector under `test-vectors/core/`. An implementation claiming `OHP-Signed` MUST pass every vector under `test-vectors/core/` **and** `test-vectors/signed/`. Sealed and Regulated extend the same way.

Conformance vectors are **bidirectional**:

| Vector category | What it tests |
| --- | --- |
| **emit-positive** | Implementation emits a valid envelope given a specified input scenario. |
| **emit-negative** | Implementation refuses to emit an envelope when the input requires fields above its claimed tier. |
| **accept-positive** | Implementation correctly accepts a valid received envelope and returns `ACCEPT`. |
| **accept-negative** | Implementation correctly REJECTs a malformed / out-of-policy envelope with the specified reason code. |

## Directory layout

```
conformance/
├── README.md                    # This file
├── test-vectors/
│   ├── core/
│   │   ├── README.md
│   │   ├── 01-minimal-valid/
│   │   ├── 02-missing-id/
│   │   ├── 03-stale-envelope/
│   │   └── ...
│   ├── signed/
│   │   ├── README.md
│   │   ├── 01-valid-jws/
│   │   ├── 02-invalid-jws/
│   │   └── ...
│   ├── sealed/
│   │   ├── README.md
│   │   ├── 01-hpke-roundtrip/
│   │   ├── 02-rtp-fingerprint-mismatch/
│   │   └── ...
│   └── regulated/
│       ├── README.md
│       ├── 01-hybrid-pq-sig/
│       ├── 02-prohibited-flag/
│       ├── 03-art50-disclosure-missing/
│       └── ...
└── runner/
    └── README.md                # Reference test runner (TBD in v0.2)
```

## Anatomy of a vector

Each test vector is a directory containing:

```
01-minimal-valid/
├── README.md           # Plain-English description of what this vector proves and which spec section it traces to
├── envelope.json       # The input envelope (for accept-* vectors) or expected output (for emit-* vectors)
├── envelope.cbor       # Canonical CBOR equivalent (generated; do NOT hand-edit)
├── input.json          # Scenario inputs (for emit-* vectors)
├── expected.json       # Expected outcome
└── keys/               # Synthetic key material for the vector
    ├── issuer-sign.jwk
    ├── issuer-enc.jwk
    └── receiver-enc.jwk
```

### `expected.json` shape

For **accept-positive** vectors:

```json
{
  "outcome": "accept",
  "verifiedFields": ["caller.assurance", "intent.slots"],
  "openedSealedFields": ["payment.disputeDetail"]
}
```

For **accept-negative** vectors:

```json
{
  "outcome": "reject",
  "rejectReason": "not-bound-to-call",
  "firstFailingStep": 4,
  "stepDescription": "RTP fingerprint mismatch"
}
```

For **emit-positive** vectors:

```json
{
  "outcome": "emit",
  "tier": "sealed",
  "verb": "PROPOSE",
  "shouldContainFields": ["caller.identity.sdJwtVc", "sealed.ciphertext"],
  "shouldNotContainFields": ["caller.identity.sdJwtVc.disclosures.dateOfBirth"]
}
```

For **emit-negative** vectors:

```json
{
  "outcome": "refuse",
  "refuseReason": "workload-requires-higher-tier",
  "minTier": "sealed"
}
```

## Running the suite

The reference test runner ships in **v0.2** (open issue tracking in [`runner/README.md`](./runner/README.md)). For v0.1, conformance is exercised manually:

```bash
# Validate every example envelope against the JSON Schema
for f in ../examples/envelopes/*.json; do
  ajv validate -s ../schemas/ohp-envelope.schema.json -d "$f"
done

# Validate test vectors structurally (they should all match the schema)
for f in test-vectors/*/*/envelope.json; do
  ajv validate -s ../schemas/ohp-envelope.schema.json -d "$f"
done
```

## Synthetic key material

All vectors ship with **synthetic** key material. The keys in `test-vectors/*/keys/` are:

- Generated specifically for the test suite
- Never used in production
- Hardcoded in the repo so vectors are reproducible

You MUST NOT use these keys to sign or seal any production traffic. The README in each `keys/` directory restates this.

## What v0.1 ships

In v0.1, the suite is **skeletal**. The directory structure, README files, and a handful of example vectors are present to anchor the schema and the verification flow. Comprehensive negative-test coverage lands in v0.2.

| Tier | Vectors shipping in v0.1 |
| --- | --- |
| Core | Minimal positive vector + stale-envelope negative |
| Signed | Valid-JWS positive (placeholder signature) |
| Sealed | HPKE round-trip walkthrough (no actual ciphertext) |
| Regulated | Full envelope structural validity |

See the per-tier README for the specifics.

## How to add a vector

1. Pick a tier directory.
2. Number your vector (next free 2-digit number).
3. Create the directory + populate the files above.
4. Write the README explaining what the vector proves and which spec section it traces to (e.g. *§10 step 4*).
5. Open a PR; the squash commit message MUST include `[vector]` to be picked up by CI (planned for v0.2).
