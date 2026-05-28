# 09 · Trust verification

> **Status:** Normative. The order of steps and the failure semantics described here are part of the OHP conformance surface.

This document specifies what the receiver does, in what order, **before** acting on any field above the Core baseline. The integrated flow combines L1 cryptographic verification with the Regulated-tier AI-governance checks introduced in [`05-ai-governance.md`](./05-ai-governance.md).

## Verification order

A receiver MUST perform these steps in order. If any step fails, the receiver MUST emit `REJECT` with the structured reason listed against that step. Falling back to a lower-assurance flow is only permitted if the sender explicitly declared a fallback in `control.fallback` **and** the lower flow does not require any field that just failed verification. **Silent downgrade is a conformance violation.**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   1.  Resolve issuer                                            │
│   2.  Verify signatures                                         │
│   3.  Check freshness                                           │
│   4.  Bind to call leg                                          │
│   5.  Resolve consent                                           │
│   6.  Check assurance                                           │
│   7.  Risk-class gate          ┐                                │
│   8.  Prohibited check         │  Regulated-tier only           │
│   9.  Annex III allowlist      │                                │
│  10.  Disclosure verify        │                                │
│  11.  Oversight match          │                                │
│  12.  GPAI policy              ┘                                │
│  13.  Decrypt sealed fields                                     │
│  14.  Anchor to log                                             │
│                                                                 │
│  ─── Only now is it safe to act on intent / slots / sealed ───  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 1 — Resolve issuer

- Look up the issuer's federation entity statement (Sealed+) or DID document (Signed+).
- For Sealed+: the issuer's `did` MUST resolve under a federation policy the receiver trusts. The receiver's federation policy declares which issuers are entitled to assert which assurance levels and which Annex III clauses.
- For Signed-only: a published JWKS at the issuer's `did:web` location is sufficient.

**On failure → `REJECT reason=signature-invalid`** (or `unknown` if the federation policy refuses the issuer for reasons other than crypto).

### Step 2 — Verify signatures

- For Signed: verify the detached Ed25519 JWS over canonical CBOR.
- For Sealed: as Signed.
- For Regulated: verify **both** the Ed25519 JWS **and** the ML-DSA-65 JWS. Both MUST verify.
- The signed bytes are the canonical CBOR serialisation of the envelope **with `signatures` and `transparency.leafHash` removed and re-inserted as empty placeholders**, per the canonicalisation rules in the normative spec.

**On failure → `REJECT reason=signature-invalid`**.

### Step 3 — Check freshness

- `notBefore` (if present) ≤ `now` ≤ `notAfter`.
- `notAfter - issuedAt` MUST be ≤ `PT5M`. Longer windows are rejected even with valid signatures.
- Clock-skew tolerance: 5 seconds on each end.

**On failure → `REJECT reason=stale`**.

### Step 4 — Bind to call leg

- Compare `session.callId` to the live SIP `Call-ID` or session identifier on the receiver's side. They MUST match.
- For Sealed+: compare `session.media.rtpFingerprint` to a fingerprint computed over the live RTP stream using the same deterministic sample algorithm. They MUST match within a configurable Hamming-distance tolerance (default: 0; deterministic).

**On failure → `REJECT reason=not-bound-to-call`**.

### Step 5 — Resolve consent

- For each entry in `caller.consent[]`:
  - Fetch the consent receipt by `receiptId` (resolvable, but receipt body NOT inlined).
  - Verify `scope ⊇` the receiver's intended processing.
  - Verify `jurisdiction` permits transfer to the receiver's processing jurisdiction (consult `policy.dataResidency`).
  - Verify `lawfulBasis` is non-empty and recognised; for special-category data verify `specialCategoryBasis` is present.

**On failure → `REJECT reason=consent-out-of-scope`**.

### Step 6 — Check assurance

- For Sealed+: validate the IdP's `proofJws` over `caller.assurance`. The IdP MUST be in the receiver's federation policy.
- Verify the federation-published assurance cap for that IdP is **≥** the asserted `aal` / `ial` / `fal`.
- If the receiver's action requires a higher assurance than the envelope carries, REJECT.

**On failure → `REJECT reason=assurance-insufficient`**.

### Steps 7–12 — Regulated-tier gates

These steps run only when the envelope's `conformance` is `regulated`. For Sealed and below, skip to step 13.

#### Step 7 — Risk-class gate

Read `aiSystem.riskClass`. If `high`:
- Require `aiSystem.ceConformity.declarationUrl` (fetch + hash-match `aiSystem.modelCardSha256`).
- Require `governance.aiia.id` and `lastReviewedAt` within 12 months.
- Require `governance.fria.id` (deployer-issued envelopes only).
- Require `oversight.mode ∈ {human-in-the-loop, human-on-the-loop}` for the receiver's policy.
- Require `governance.art50Disclosure.disclosed = true` with valid `proofJws`.

**On failure → `REJECT reason=risk-class-not-allowed`** (or `oversight-missing`, etc., as appropriate).

#### Step 8 — Prohibited check

Read `governance.prohibited.*`. If **any** flag is `true`, REJECT regardless of other fields.

**On failure → `REJECT reason=prohibited-practice`**.

#### Step 9 — Annex III allowlist

Compare `aiSystem.annexIIIClause` against the receiver's published allowlist (`/.well-known/ohp-capabilities.json#annexIIIAllowed`). If outside the allowlist, REJECT.

**On failure → `REJECT reason=risk-class-not-allowed`**.

#### Step 10 — Disclosure verify

Validate `governance.art50Disclosure.proofJws` is signed by the issuer over the disclosure record. If `disclosed` is `false` and the channel reaches a natural person, the receiver MUST emit its own disclosure before the first turn (but MUST NOT REJECT solely for this).

**On failure → `REJECT reason=signature-invalid`** (when proof is invalid).

#### Step 11 — Oversight match

Compare `oversight.mode` to the receiver's policy for the action being requested.
- If policy requires `human-in-the-loop` and envelope says `on-the-loop`, REJECT.
- If policy requires `on-the-loop` and envelope says `in-command`, REJECT.

**On failure → `REJECT reason=oversight-missing`**.

#### Step 12 — GPAI policy

For each entry in `aiSystem.gpaiChain` where `systemicRisk = true`:
- Verify `policyUrl` resolves to a non-error response.
- The receiver MAY perform additional policy compliance checks; the spec only requires resolvability.

**On failure → `REJECT reason=gpai-policy-missing`**.

### Step 13 — Decrypt sealed fields

For Sealed+:
- Iterate `sealed.recipients[]`; for each, find the entry whose `kid` matches one of the receiver's published HPKE keys.
- HPKE-open that recipient slot.
- Discard sealed fields not addressed to this receiver.

If no recipient entry matches, the receiver SHOULD process the envelope's non-sealed portion only (it is informational), but MUST NOT pretend to have processed sealed content.

### Step 14 — Anchor to log

For Regulated:
- Submit the envelope hash to the transparency log identified in `transparency.logId`.
- Persist the returned Signed Note alongside the receiver-side ticket.
- The Signed Note is the receiver's non-repudiable record that it processed this envelope.

For Sealed and below: anchoring is OPTIONAL but RECOMMENDED.

## Acting on the envelope

Only after all preceding steps succeed may the receiver:

- Honour the `control.verb` (move to `ACCEPTED` / take the conversation / etc.)
- Pop the screen for a human agent
- Forward intent / slot / sealed-field content to downstream services
- Read `memory.embeddings` (subject to `memory.modelAllowlist`)
- Initiate the receiver-side audio path

## REJECT response envelope

A `REJECT` response is itself an OHP envelope. It MUST contain:

- `control.verb = "REJECT"`
- `control.reason` from the structured reason codes
- A reference to the rejected envelope's `id` via a `control.refs.proposedId` field
- The receiver's own signed envelope under the same tier the receiver advertises

If the reason is `tier-insufficient`, the response MUST include `audience.minTier` set to the receiver's advertised max tier, so the sender knows what it can re-issue against.

## Worked example — Sealed envelope with one failure

Imagine an envelope where step 4 (RTP fingerprint binding) fails because the receiver computed `sha256:8f12...` but the envelope carries `sha256:7a91...`. The receiver:

1. Stops verification immediately at step 4.
2. Builds a REJECT response envelope:

```json
{
  "ohp": "0.1",
  "conformance": "sealed",
  "id": "cse_01HZX0...REJ",
  "issuedAt": "2026-05-28T13:42:13Z",
  "notAfter":  "2026-05-28T13:47:13Z",
  "issuer":   { "vendor": "vendor-b", "did": "did:web:cc.example.com" },
  "audience": { "vendor": "vendor-a", "purpose": "ai-vendor-handoff" },
  "session":  { "callId": "callid_2026K9" },
  "control":  {
    "verb": "REJECT",
    "reason": "not-bound-to-call",
    "refs":   { "proposedId": "cse_01HZX0R5N9V8W1QYK0XQM3R3K9" },
    "nonce":  "1c2d3e"
  },
  "signatures": [ ... ]
}
```

3. Sends the REJECT over the same binding as the PROPOSE.
4. The sender MAY retry with a freshly-computed RTP fingerprint if it has reason to believe step 4 failed because of a fingerprint clock-skew during early call setup, or it MAY treat the call as a transfer failure and route the caller to fallback (e.g. play a "please hold while I transfer you" tone and try a different receiver).

## Conformance vectors

The receiver-side verification logic is exercised by the test vectors in `conformance/test-vectors/`. Each vector includes:

- An input envelope
- The expected verification outcome (accept / reject + reason)
- Which step is expected to be the first failure (for reject vectors)

A claimed-conformant receiver MUST produce the expected outcome for every vector in its tier and every tier below.
