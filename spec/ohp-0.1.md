# Open Handoff Protocol — Specification

**Version:** 0.1
**Status:** Public Draft
**Authoring org:** Cloudax
**Date:** 2026-05-28
**Editors:** see [`../MAINTAINERS.md`](../MAINTAINERS.md)

---

## Abstract

The Open Handoff Protocol (OHP) defines a tiered, vendor-neutral wire format for handing off live voice conversations — including context, intent, state, identity, consent, and media continuity — between voice AI agents, interactive voice response systems (IVRs), contact centres, and humans. OHP is designed to be embedded in SIP, WebRTC, and HTTP/WebSocket control planes without forcing a single runtime, model, or telephony provider. The protocol is engineered for regulated-data flows: authenticated caller identity, identity verification outcomes, payment instructions, healthcare context, and other sensitive personal data are carried across vendor boundaries with cryptographic provenance, selective disclosure, and machine-readable consent receipts.

## Status of this memo

This document is published as a **Public Draft**. The specification is feature-complete for the four conformance tiers described herein, but field names and minor schema details MAY change before v1.0. Implementers are encouraged to claim conformance to the highest tier they have validated against [`../conformance/test-vectors/`](../conformance/test-vectors/).

OHP is published under the Apache License, Version 2.0. The specification is intended to be implementable by any party without royalty or registration.

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) when, and only when, they appear in all capitals.

## Table of contents

- §1 Introduction
- §2 Terminology
- §3 Conformance tiers
- §4 Conversation State Envelope (L4)
- §5 Trust, identity, and crypto (L1)
- §6 AI governance metadata (Regulated tier)
- §7 Transport bindings (L2)
- §8 Control verbs and flow (L3)
- §9 Media continuity (L0)
- §10 Receiver verification order
- §11 Capabilities manifest
- §12 Security considerations
- §13 IANA considerations
- §14 References

---

## §1 Introduction

OHP fills a gap in the existing voice and AI standards stack. SIP and WebRTC standardise signalling and media. MCP standardises tool calls inside one agent runtime. OVON Open Floor standardises agent discovery vocabulary. CCXML / VoiceXML standardise legacy IVR dialog. CPaaS webhooks are vendor-specific. None of these standardise the **live conversation state** — verified caller identity, intent, slots, consent, media continuity — as it crosses a vendor boundary.

OHP defines that wire format. It does not replace SIP, WebRTC, MCP, or Open Floor; it composes with them.

## §2 Terminology

See [`../docs/glossary.md`](../docs/glossary.md) for the full glossary. Key terms used normatively in this specification:

- **Issuer** — the party emitting an OHP envelope.
- **Audience** — the party the envelope is addressed to.
- **Receiver** — the audience, in its active verification role.
- **Sender** — the issuer, in its active transmission role.
- **Envelope** — the L4 Conversation State Envelope (CSE).
- **Verb** — one of the L3 control plane operations.
- **Tier** — one of `core`, `signed`, `sealed`, `regulated`.

## §3 Conformance tiers

### §3.1 Tier definitions

OHP defines four conformance tiers. An envelope **MUST** declare exactly one tier in `conformance`. Each tier is a strict superset of the one below.

#### §3.1.1 Core

Core-tier implementations **MUST**:

1. Emit and accept envelopes with the mandatory Core fields enumerated in §4.2.
2. Speak at least one transport binding defined in §7.
3. Honour the five control verbs `PROPOSE`, `ACCEPT`, `REJECT`, `ASSUME`, `RETURN` as specified in §8.
4. Run all transport over TLS 1.3 (or DTLS 1.3 / SRTP for SIP-rooted media).
5. Publish a capabilities manifest at `/.well-known/ohp-capabilities.json` (§11).

Core-tier envelopes **MUST NOT** carry PII, payment tokens, PHI, assurance claims, sealed fields, or `decisions[]`. Senders **MUST** refuse to issue Core if the workload requires any field above the Core baseline.

#### §3.1.2 Signed

Signed-tier implementations **MUST**:

1. Satisfy all Core requirements.
2. Emit and verify detached Ed25519 JWS signatures over canonical CBOR (§5.2).
3. Publish a JWK Set at `/.well-known/ohp-jwks.json`.
4. Enforce envelope idempotency by `(id, nonce)` for the envelope lifetime + clock-skew margin.

Signed-tier envelopes **MAY** carry authenticated identity references (e.g. `accountRef`) and generic non-PII slot values. They **MUST NOT** carry sealed PII, payment tokens, or PHI.

#### §3.1.3 Sealed

Sealed-tier implementations **MUST**:

1. Satisfy all Signed requirements.
2. Implement HPKE per-recipient sealing using X25519-SHA256-ChaCha20Poly1305 (§5.3).
3. Accept SD-JWT VC identity claims with selective disclosure (§5.4).
4. Verify ISO/IEC 27560 consent receipts referenced by `caller.consent[].receiptId` (§5.5).
5. Bind transport tokens with DPoP (RFC 9449).
6. Verify `session.media.rtpFingerprint` against the live RTP leg (§9).

Sealed-tier envelopes **MAY** carry HIPAA PHI via sealed FHIR references, PCI network tokens, AAL2/AAL3 assurance claims, and cross-border PII with a lawful-transfer claim.

#### §3.1.4 Regulated

Regulated-tier implementations **MUST**:

1. Satisfy all Sealed requirements.
2. Emit and verify hybrid Ed25519 + ML-DSA-65 signatures (FIPS 204). **Both** signatures **MUST** verify.
3. Anchor envelope hashes to a transparency log identified in `transparency.logId` before sending (§5.7).
4. Establish trust via OpenID Federation 1.0 (§5.6).
5. Populate the `aiSystem`, `governance`, `oversight`, and `decisions[]` blocks as required by §6.
6. Support the reserved `INCIDENT` control verb for EU AI Act Art 73 reporting.

### §3.2 Sender × receiver handshake

A receiver **MUST** refuse an envelope whose `conformance` tier is below `audience.minTier` with `REJECT reason="tier-insufficient"`, including the receiver's advertised max tier in the response.

A receiver **MUST** refuse an envelope whose `conformance` tier exceeds the receiver's advertised max tier at `/.well-known/ohp-capabilities.json` with the same reason code.

A receiver **MUST NOT** silently strip Sealed or Regulated fields it cannot process. Silent downgrade is a conformance violation.

A sender **MAY** re-issue at a lower tier in response to a `tier-insufficient` rejection, but only if the workload's `minTier` permits.

## §4 Conversation State Envelope (L4)

### §4.1 Canonical representation

The envelope has two representations:

- **JSON** (UTF-8) — the human-readable wire format for `ohp/ws` and `ohp/https`, and the format used in examples and schemas.
- **Canonical CBOR** — the deterministic binary serialisation used as the signing surface (§5.2) and as the wire format for `ohp/sip-info`.

The JSON representation **MUST** conform to the JSON Schema at [`../schemas/ohp-envelope.schema.json`](../schemas/ohp-envelope.schema.json). The CBOR representation **MUST** conform to the CDDL at [`../schemas/ohp-envelope.cddl`](../schemas/ohp-envelope.cddl).

### §4.2 Mandatory fields by tier

| Field | Core | Signed | Sealed | Regulated |
| --- | --- | --- | --- | --- |
| `ohp` | **MUST** | **MUST** | **MUST** | **MUST** |
| `conformance` | **MUST** | **MUST** | **MUST** | **MUST** |
| `id` | **MUST** | **MUST** | **MUST** | **MUST** |
| `issuedAt` | **MUST** | **MUST** | **MUST** | **MUST** |
| `notAfter` | **MUST** | **MUST** | **MUST** | **MUST** |
| `notBefore` | MAY | SHOULD | SHOULD | **MUST** |
| `issuer.vendor` | **MUST** | **MUST** | **MUST** | **MUST** |
| `issuer.agentId` | **MUST** | **MUST** | **MUST** | **MUST** |
| `issuer.region` | **MUST** | **MUST** | **MUST** | **MUST** |
| `issuer.did` | MAY | **MUST** | **MUST** | **MUST** |
| `issuer.federation` | — | MAY | **MUST** | **MUST** |
| `issuer.aiRole` | — | — | SHOULD | **MUST** |
| `audience.vendor` | **MUST** | **MUST** | **MUST** | **MUST** |
| `audience.did` | MAY | **MUST** | **MUST** | **MUST** |
| `audience.purpose` | **MUST** | **MUST** | **MUST** | **MUST** |
| `audience.minTier` | **MUST** | **MUST** | **MUST** | **MUST** |
| `audience.recipientKeys` | — | — | **MUST** | **MUST** |
| `session.callId` | **MUST** | **MUST** | **MUST** | **MUST** |
| `session.channel` | **MUST** | **MUST** | **MUST** | **MUST** |
| `session.locale` | **MUST** | **MUST** | **MUST** | **MUST** |
| `session.media.rtpFingerprint` | — | SHOULD | **MUST** | **MUST** |
| `caller.assurance` | — | — | **MUST** | **MUST** |
| `caller.identity.sdJwtVc` | — | — | **MUST** | **MUST** |
| `caller.consent[]` | MAY | SHOULD | **MUST** | **MUST** |
| `intent.current` | **MUST** | **MUST** | **MUST** | **MUST** |
| `intent.stack` | **MUST** | **MUST** | **MUST** | **MUST** |
| `intent.slots` | **MUST** | **MUST** | **MUST** | **MUST** |
| `sealed` | — | — | MAY | MAY |
| `transcript.summary` | **MUST** | **MUST** | **MUST** | **MUST** |
| `transcript.turns` | MAY | MAY | SHOULD | SHOULD |
| `transcript.redaction` | SHOULD | **MUST** | **MUST** | **MUST** |
| `memory` | MAY | MAY | MAY | MAY |
| `aiSystem` | — | — | — | **MUST** |
| `governance.aiia` | — | — | — | **MUST** |
| `governance.fria` | — | — | — | **MUST** (deployer) |
| `governance.prohibited` | — | — | — | **MUST** |
| `governance.art50Disclosure` | — | — | — | **MUST** |
| `governance.art86Explanation` | — | — | — | **MUST** (high-risk) |
| `oversight` | — | — | — | **MUST** (high-risk) |
| `decisions[]` | — | — | — | **MUST** (≥ 1) |
| `policy.retention` | SHOULD | **MUST** | **MUST** | **MUST** |
| `policy.redaction` | SHOULD | **MUST** | **MUST** | **MUST** |
| `policy.guardrails` | MAY | SHOULD | SHOULD | **MUST** |
| `policy.dataResidency` | SHOULD | **MUST** | **MUST** | **MUST** |
| `control.verb` | **MUST** | **MUST** | **MUST** | **MUST** |
| `control.reason` | SHOULD | **MUST** | **MUST** | **MUST** |
| `control.nonce` | **MUST** | **MUST** | **MUST** | **MUST** |
| `control.fallback` | MAY | SHOULD | SHOULD | SHOULD |
| `transparency.logId` | — | — | SHOULD | **MUST** |
| `transparency.leafHash` | — | — | SHOULD | **MUST** |
| `signatures[]` | — | **MUST** (Ed25519) | **MUST** (Ed25519) | **MUST** (Ed25519 + ML-DSA-65) |

### §4.3 Field semantics

Field-by-field descriptions for non-normative use are in [`../docs/06-envelope.md`](../docs/06-envelope.md). Normative type and constraint requirements are in the JSON Schema.

### §4.4 Envelope lifetime

- `issuedAt` **MUST** be the wall-clock time at envelope construction, with millisecond precision.
- `notAfter` **MUST** be ≤ `issuedAt + PT5M`. Receivers **MUST** reject longer windows even when signatures verify.
- `notBefore`, if present, **MUST** be ≥ `issuedAt`.
- Receivers **MUST** tolerate ±5 seconds of clock skew when comparing to local wall-clock.

### §4.5 Envelope size

- The serialised JSON envelope **MUST NOT** exceed 32 KiB.
- The canonical CBOR (signing surface) **MUST NOT** exceed 8 KiB.
- Payloads exceeding these limits **MUST** be moved out-of-band and referenced from the envelope.

### §4.6 Identifier formats

- `id` **MUST** be a Crockford-base32 ULID (26 characters), prefixed `cse_`.
- `nonce` **MUST** be at least 64 bits of entropy, hex-encoded.
- `dec_*` ids within `decisions[]` **MUST** also be ULIDs.

## §5 Trust, identity, and crypto (L1)

### §5.1 Signatures (Signed, Sealed, Regulated)

- Signed: a single detached JWS with `alg = EdDSA` over canonical CBOR.
- Sealed: as Signed.
- Regulated: two detached JWS objects — one `EdDSA`, one `ML-DSA-65`. **Both MUST verify.** This is the hybrid post-quantum scheme.

Detached JWS construction follows RFC 7515 §A.5 with the payload being the canonical CBOR of the envelope **with** `signatures` and `transparency.leafHash` removed and re-inserted as empty placeholders before canonicalisation. The exact canonicalisation procedure is in §5.2.

### §5.2 Canonical CBOR

The signing surface is canonical CBOR per RFC 8949 §4.2.1 (core deterministic encoding), with the following OHP-specific rules:

1. Map keys are sorted lexicographically by their byte-encoded representation.
2. Floating-point numbers MUST use the shortest CBOR representation that preserves the value.
3. Tags 0 (RFC 3339 datetimes) MUST be used for `issuedAt`, `notBefore`, `notAfter`.
4. The `signatures` field is set to an empty array `[]` before canonicalisation, and the `transparency.leafHash` field, if present, is set to a 32-byte zeroed string. After signature is computed and the transparency log is anchored, the fields are restored to their real values.

### §5.3 HPKE sealing (Sealed, Regulated)

Sealed fields are encrypted using HPKE per RFC 9180 with the suite **X25519-HKDF-SHA256 / HKDF-SHA256 / ChaCha20Poly1305**.

- `sealed.alg` **MUST** be the string `"HPKE/X25519-SHA256-CHACHA20POLY1305"`.
- For each recipient listed in `audience.recipientKeys[]`, the sender generates a per-recipient `enc` (encapsulated key) and includes it in `sealed.recipients[]` keyed by `kid`.
- The plaintext is a canonical CBOR map of the sealed field names to their values.
- The `aad` (additional authenticated data) **MUST** be the canonical CBOR of `{ id, issuedAt, audience.did, session.callId }`.

A receiver **MUST** only open the recipient slot keyed to its own published HPKE key. Other slots **MUST** be discarded without attempting to decrypt.

### §5.4 SD-JWT VC identity (Sealed, Regulated)

Caller identity at Sealed+ is carried as an SD-JWT VC per draft-ietf-oauth-sd-jwt-vc. The sender includes only the disclosures permitted by the audience's `purpose`. The receiver verifies the IdP's signature, then validates each disclosure against the SD-JWT's digest list.

The `caller.identity.claimsRevealed[]` field enumerates the human-readable claim names revealed. A receiver **MUST NOT** treat this field as authoritative; it **MUST** independently validate the disclosures.

### §5.5 Consent receipts (Sealed, Regulated)

Each entry in `caller.consent[]` carries:

- `receiptId` — resolvable identifier of an ISO/IEC 27560:2023 consent receipt.
- `purpose` — the purpose for this handoff. The receiver **MUST** REJECT if its intended processing exceeds the receipt's declared purpose.
- `scope[]` — RAR-style scope array.
- `lawfulBasis` — GDPR Art 6 basis identifier.
- `specialCategoryBasis` — GDPR Art 9 basis identifier, REQUIRED when the receiver will process special-category data.
- `jurisdiction` — ISO 3166-1 alpha-2 country code.
- `transferMechanism` — one of `scc` | `dpf` | `adequacy` | `uk-adequacy` | `none`.

The receipt body is NOT inlined in the envelope. The `receiptId` **MUST** be resolvable by the receiver (typically via a customer-operated consent management endpoint).

### §5.6 OpenID Federation (Sealed, Regulated)

At Sealed+, the receiver **MUST** resolve the issuer's federation entity statement before honouring any sealed field. The federation policy declares:

- Which issuers may assert which assurance levels.
- Which Annex III clauses each issuer is authorised to operate on.
- Which jurisdictions each issuer is authorised for.

The receiver **MUST** refuse envelopes from issuers not in the federation policy.

### §5.7 Transparency log (Regulated)

Every Regulated envelope **MUST** be anchored to a transparency log before send. The sender computes the canonical CBOR hash, submits it to the log, receives a Signed Note, and includes:

- `transparency.logId` — identifier of the log instance.
- `transparency.leafHash` — SHA-256 of the canonical CBOR (with `signatures` and `transparency.leafHash` empty).

The receiver **MAY** independently verify the inclusion proof. Persisted Signed Notes on both sender and receiver constitute the non-repudiable audit trail.

### §5.8 DPoP (Sealed, Regulated)

Transport tokens (Bearer tokens used for the underlying HTTPS, WS, or gRPC bindings) **MUST** be DPoP-bound per RFC 9449. The DPoP key identifier (`jkt`) is constrained against the issuer's published JWKS.

### §5.9 Key management

- Issuers **MUST** publish their JWKS at `/.well-known/ohp-jwks.json`.
- Signing keys SHOULD be rotated every ≤ 90 days; encryption keys every ≤ 30 days.
- Revoked keys remain in the JWKS for at least 1 hour after the longest envelope lifetime to allow in-flight envelopes to be verified.
- Receivers **MUST** treat absence of a `kid` from the current JWKS as revoked.

### §5.10 Rate limiting

Receivers **MUST** enforce per-issuer-`kid` rate limits. The default is implementation-defined but **MUST** be ≥ 1 envelope per second per `kid` for any issuer admitted into the federation policy.

When the rate limit is exceeded, the receiver **MUST** respond `REJECT reason="rate-limit"`.

## §6 AI governance metadata (Regulated tier)

### §6.1 `aiSystem`

Required at Regulated tier. Fields:

- `id` — URN of the AI system, version-distinct.
- `version` — system version.
- `modelCardSha256` — hash of the published model card. Receivers **MAY** fetch the card and verify the hash.
- `riskClass` — one of `prohibited` | `high` | `limited` | `minimal`.
- `annexIIIClause` — required when `riskClass = high`.
- `ceConformity` — `{ assessmentRoute, notifiedBodyId, declarationUrl, validUntil }`.
- `gpaiChain[]` — array of upstream GPAI providers with `systemicRisk` bit and `policyUrl` (REQUIRED when `systemicRisk = true`).
- `postMarketEndpoint` — URL accepting post-market monitoring observations from receivers.

### §6.2 `governance`

Required at Regulated tier. Fields:

- `aiia` — `{ id, lastReviewedAt, residualRisk, uri }`. `lastReviewedAt` **MUST** be within 12 months of `issuedAt` for high-risk systems.
- `fria` — `{ id, completedAt, uri }`. **MUST** be present when `issuer.aiRole = "deployer"` and `aiSystem.riskClass = "high"`.
- `prohibited` — Art 5 attestation. All flags `false` for a conformant envelope. `attestationJws` signed by issuer.
- `art50Disclosure` — `{ disclosed, at, modality, language, transcript, ack, proofJws }`. The `proofJws` **MUST** be signed by issuer.
- `art86Explanation` — `{ available, endpoint }`. **MUST** be present when `riskClass = "high"`.

### §6.3 `oversight`

Required at Regulated tier when `aiSystem.riskClass = "high"`. Fields:

- `mode` — `human-in-the-loop` | `human-on-the-loop` | `human-in-command`.
- `supervisor.presence` — `live` | `available` | `none`.
- `supervisor.identity` — supervisor identifier.
- `supervisor.channelRef` — channel for live escalation.
- `escalation.triggers[]` — array of trigger expressions.
- `escalation.verb` — control verb to emit on trigger.
- `escalation.target` — target audience for the escalation envelope.
- `lastReviewAt` — most recent supervisor review timestamp.

### §6.4 `decisions[]`

Required at Regulated tier. Each entry:

- `id` — ULID `dec_*`.
- `at` — RFC 3339 datetime.
- `type` — one of `intent.classification` | `slot.assignment` | `routing.decision` | `payment.authorisation` | `assurance.step-up` | `tool.call` | `policy.refusal` | `escalation`.
- `input` — object describing the input considered.
- `output` — object describing the decision.
- `model` — URN of the AI system that made the decision (defaults to `aiSystem.id`).
- `rationaleRef` — resolvable reference to the human-readable rationale.
- `humanReviewed` — boolean.
- `reviewer` — required when `humanReviewed = true`.

At least one decision **MUST** be present in a Regulated envelope.

### §6.5 `INCIDENT` verb

The `INCIDENT` verb is reserved at the Regulated tier for issuing an EU AI Act Art 73 serious-incident report. The 15-day clock starts at envelope issuance. The envelope's `control.reason` **MUST** carry the Art 73 incident category. The envelope **MUST** be anchored to the transparency log.

## §7 Transport bindings (L2)

### §7.1 `ohp/sip-info`

- Content-Type: `application/ohp+cbor`.
- Body: canonical CBOR of the envelope.
- Multi-part chunking when body > 1300 bytes; reassembly by `id` + chunk index.
- Idempotency: SIP `Call-ID` + `CSeq` + envelope `id`.
- Header: `OHP-Version`, `OHP-Tier`, `OHP-Verb` mirror envelope values.

### §7.2 `ohp/ws`

- WebSocket text frames carrying `application/ohp+json`.
- First frame on a new connection **MUST** be a `hello` frame.
- Idempotency: envelope `id` dedupe per connection-pair for the envelope lifetime + 5s clock-skew.
- Heartbeat: `ping` / `pong` every 20s.

### §7.3 `ohp/https`

- `POST /ohp/v1/transfer`.
- Content-Type: `application/ohp+json`.
- `Idempotency-Key` header **MUST** equal envelope `id`.
- `DPoP` header REQUIRED at Sealed+.
- Response is itself an OHP envelope (`ACCEPT` / `REJECT`).

### §7.4 `ohp/grpc`

- Bidirectional streaming RPC `Handoff.Stream`.
- Protobuf descriptor MIRROR of JSON Schema; field numbers stable across spec versions.
- Idempotency: stream-scoped + envelope `id` across streams for the envelope lifetime.

A conformant implementation **MUST** support at least one binding; **full conformance** requires all four.

## §8 Control verbs and flow (L3)

### §8.1 Verbs

| Verb | Meaning |
| --- | --- |
| `PROPOSE` | "I would like to hand off this conversation to you. Here is the state." |
| `ACCEPT` | "I will take this conversation. I have verified your envelope." |
| `REJECT` | "I will not take this conversation, for reason X." |
| `ASSUME` | "I now hold the conversation. Drop your media leg." |
| `RETURN` | "I am handing the conversation back to you." |
| `INCIDENT` | (Regulated only) Art 73 serious-incident report. |

### §8.2 State machine

See [`../docs/08-handoff-flows.md`](../docs/08-handoff-flows.md) §"State machine". The state machine is normative.

### §8.3 REJECT reasons

Receivers **MUST** use one of the following reason codes in the response envelope's `control.reason`:

- `tier-insufficient`
- `signature-invalid`
- `stale`
- `not-bound-to-call`
- `consent-out-of-scope`
- `assurance-insufficient`
- `risk-class-not-allowed`
- `prohibited-practice`
- `oversight-missing`
- `gpai-policy-missing`
- `rate-limit`
- `unknown`

### §8.4 Timeouts

- `PROPOSE` without `ACCEPT` / `REJECT` by `notAfter`: rejected with `stale`.
- `ACCEPTED` without `ASSUME` within `PT10S`: receiver **MAY** REJECT and release resources.
- Clock skew: 5 seconds across all timeouts.

## §9 Media continuity (L0)

### §9.1 RTP fingerprint

`session.media.rtpFingerprint` is a SHA-256 over a deterministic sample of the active RTP stream:

1. Capture the first 200 ms of the most recent RTP payload after envelope construction begins.
2. If the codec is Opus, decode to 48 kHz mono PCM. If PCMU/PCMA, decode to 8 kHz PCM.
3. Compute SHA-256 over the PCM bytes.
4. Encode as `sha256:<hex>`.

Receivers compute the same value over the live leg and compare. The comparison **MUST** be exact at v0.1; a future minor version MAY introduce a Hamming-distance tolerance for cross-codec hand-offs.

### §9.2 SDP hints

`session.media.sdpHints` carries codec hints so the receiver can prepare its media path before sending `ACCEPT`. The receiver **MUST** be tolerant of additional or missing hints.

## §10 Receiver verification order

The receiver-side verification order is normative and is specified in [`../docs/09-trust-verification.md`](../docs/09-trust-verification.md). Implementations **MUST** perform the steps in the order specified and **MUST** abort verification at the first failure.

## §11 Capabilities manifest

Receivers **MUST** publish `/.well-known/ohp-capabilities.json` per the schema at [`../schemas/well-known/ohp-capabilities.schema.json`](../schemas/well-known/ohp-capabilities.schema.json). The manifest declares:

- `maxTier` — the receiver's highest supported tier.
- `bindings[]` — supported transport bindings.
- `verbs[]` — supported control verbs.
- `purposes[]` — accepted audience purposes.
- `jurisdictions[]` — accepted processing jurisdictions.
- `annexIIIAllowed[]` — accepted Annex III clauses (Regulated).

Senders SHOULD fetch the manifest before the first envelope and respect its declared values.

## §12 Security considerations

See [`../docs/04-security-model.md`](../docs/04-security-model.md) for the threat model. Security considerations from that document are normative where the document uses RFC 2119 keywords.

Additional considerations:

- **Replay** — envelopes are bound to `session.callId` and `rtpFingerprint`. The short lifetime (`≤ PT5M`) limits replay windows.
- **Confidentiality** — sealed fields use HPKE with per-recipient encapsulation. Intermediaries see opaque ciphertext.
- **Post-quantum** — Regulated tier uses hybrid Ed25519 + ML-DSA-65. The classical signature stays valid if quantum attacks remain infeasible; the PQ signature provides a hedge.
- **Identity assurance** — assurance is signed by an external IdP, not by the sender. A colluding IdP + sender can still inflate assurance; this is acknowledged as an out-of-scope risk handled by federation policy.

## §13 IANA considerations

This document requests:

1. Registration of the media types `application/ohp+json` and `application/ohp+cbor`.
2. Registration of the URL scheme prefix `ohp://` (informative use only; not a network protocol scheme).
3. Registration of the `OHP-Version`, `OHP-Tier`, and `OHP-Verb` HTTP header fields.
4. Registration of the `.well-known/ohp-capabilities.json`, `.well-known/ohp-jwks.json`, and `.well-known/ohp-ai-systems.json` well-known URIs per RFC 8615.

These registrations are intended for a future IETF informational draft at v1.0.

## §14 References

### Normative references

- [RFC 2119] Key words for use in RFCs.
- [RFC 3339] Date and Time on the Internet.
- [RFC 7515] JSON Web Signature (JWS).
- [RFC 7517] JSON Web Key (JWK).
- [RFC 8174] Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words.
- [RFC 8615] Well-Known Uniform Resource Identifiers.
- [RFC 8949] Concise Binary Object Representation (CBOR).
- [RFC 9162] Certificate Transparency Version 2.0.
- [RFC 9180] Hybrid Public Key Encryption.
- [RFC 9396] OAuth 2.0 Rich Authorization Requests.
- [RFC 9449] OAuth 2.0 Demonstrating Proof of Possession (DPoP).
- [FIPS 204] Module-Lattice-Based Digital Signature Standard.
- [ISO/IEC 27560:2023] Privacy technologies — Consent record information structure.
- [ISO/IEC 42001:2023] Information technology — Artificial intelligence — Management system.
- [EU AI Act] Regulation (EU) 2024/1689.
- [draft-ietf-oauth-sd-jwt-vc] SD-JWT-based Verifiable Credentials.

### Informative references

- [draft-ietf-cose-pqc] Post-Quantum Cryptography in COSE.
- [draft-ietf-rats-eat] The Entity Attestation Token (EAT).
- [NIST SP 800-57] Recommendation for Key Management.
- [NIST SP 800-63-3] Digital Identity Guidelines.
- [NIST AI RMF 1.0] AI Risk Management Framework.
- [openid-federation-1_0] OpenID Federation 1.0.
- [PCI DSS 4.0] Payment Card Industry Data Security Standard, v4.0.
- [HIPAA] Health Insurance Portability and Accountability Act.
- [GDPR] Regulation (EU) 2016/679.
- [Sigstore / rekor] Sigstore transparency log.

### Adjacent specifications referenced

- MCP (Model Context Protocol)
- OVON Open Floor
- SIP REFER (RFC 3515)
- WebRTC (W3C / IETF)
- CCXML, VoiceXML
- OpenTelemetry GenAI semconv

---

*End of OHP v0.1 specification.*
