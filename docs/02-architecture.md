# 02 · Architecture

> **Status:** Non-normative. Layer numbers and verb names are normative; see [`../spec/ohp-0.1.md`](../spec/ohp-0.1.md).

OHP is intentionally **layered**. A vendor can adopt L4 alone (just the envelope) and still interoperate with a full implementation. Each lower layer is optional but recommended; together they take a deployment from anonymous IVR FAQ up to healthcare + payments + EU AI Act high-risk.

```
+-----------------------------------------------------------------+
|  L4  Conversation State Envelope  (THE document — mandatory)    |
+-----------------------------------------------------------------+
|  L3  Control Plane                                              |
|        PROPOSE · ACCEPT · REJECT · ASSUME · RETURN              |
|        (+ INCIDENT, reserved for Regulated)                     |
+-----------------------------------------------------------------+
|  L2  Transport Bindings                                         |
|        ohp/sip-info · ohp/ws · ohp/https · ohp/grpc             |
+-----------------------------------------------------------------+
|  L1  Trust, Identity & Crypto                                   |
|        HPKE seal · SD-JWT VC · PQ-hybrid JWS · DPoP             |
|        ISO 27560 receipts · OpenID Federation · transparency log|
+-----------------------------------------------------------------+
|  L0  Media Continuity                                           |
|        SDP re-INVITE · SFU forwarding · RTP fingerprint         |
+-----------------------------------------------------------------+
```

Data flows top-to-bottom on the wire (envelope is the unit of meaning, wrapped by trust, transported by binding, anchored to media). Trust flows bottom-to-top: a receiver verifies media continuity and trust assertions before honouring the envelope.

## L4 · Conversation State Envelope (CSE)

The CSE is the only mandatory layer. It is a canonical JSON document, versioned by the `ohp` field, content-addressed by `id` (a ULID), and redaction-aware (transcripts carry a redaction policy reference; raw PII / PCI / PHI is forbidden in any non-sealed field).

Mandatory at every tier:

- `ohp` — wire-format version (e.g. `"0.1"`)
- `conformance` — exactly one of `core` | `signed` | `sealed` | `regulated`
- `id` — ULID, idempotency key
- `issuedAt`, `notAfter` — RFC 3339; `notAfter` MUST be ≤ 5 minutes from `issuedAt`
- `issuer` — vendor identification block
- `audience` — intended receiver + purpose + `minTier`
- `session.callId` — opaque call identifier
- `control.verb` — one of the five verbs (six counting `INCIDENT`)

Optional but defining at each tier:

- **Signed+** adds `signatures[]`
- **Sealed+** adds `caller.assurance`, `caller.identity.sdJwtVc`, `sealed`, `audience.recipientKeys[]`
- **Regulated** adds `aiSystem`, `governance`, `oversight`, `decisions[]`, `transparency`

See [`06-envelope.md`](./06-envelope.md) for the full field reference.

### Design rules

- **Self-describing.** A v0.1 reader gracefully ignores v0.2 additions (forward compatibility). Field IDs are stable strings, not positional.
- **Loggable at Core.** A Core-tier envelope contains no PII, no PHI, no payment material. It is safe for receiver-side observability tooling to capture in full.
- **Sealed by tier above Core.** Anything sensitive lives under `sealed.ciphertext`, addressed by HPKE per-recipient key. Intermediaries see opaque bytes.
- **Identity is signed by an IdP, not the sender.** Assurance claims come with a detached JWS signed by the identity provider. The handing-off agent cannot inflate AAL.
- **Memory hints are model-allowlisted.** `memory.modelAllowlist` constrains which model families may consume the hint. Receivers MUST drop hints not signed for their model family.
- **Transcripts carry a redaction policy reference, never raw PII.** Receivers re-redact on display.

## L3 · Control Plane

OHP defines five core verbs. Each verb is idempotent (keyed by envelope `id`), acknowledged, and replayable.

| Verb | Sender | Receiver responds with | Meaning |
| --- | --- | --- | --- |
| `PROPOSE` | Outgoing party | `ACCEPT` or `REJECT` | "I would like to hand off this conversation to you. Here is the state." |
| `ACCEPT` | Receiver | (no response) | "I will take this conversation. I have verified your envelope." |
| `REJECT` | Receiver | (no response) | "I will not take this conversation, for reason X." Reasons are structured (see below). |
| `ASSUME` | New holder | (no response) | "I now hold the conversation. Drop your media leg." |
| `RETURN` | Receiver | (sender resumes) | "I am handing the conversation back to you" (e.g. after escalation completes). |

One additional verb is reserved for **Regulated** tier:

| Verb | Sender | Meaning |
| --- | --- | --- |
| `INCIDENT` | Provider or deployer | "An EU AI Act Art 73 serious-incident report is being issued against this conversation. Anchored to transparency log; 15-day clock starts now." |

### Structured `REJECT` reasons

Receivers MUST use one of the following reason codes in the response envelope's `control.reason`:

| Code | Meaning |
| --- | --- |
| `tier-insufficient` | The envelope's tier is below the receiver's advertised max OR below the workload's `minTier`. The response includes the receiver's `maxTier`. |
| `signature-invalid` | Detached JWS failed verification. |
| `stale` | `notAfter` is in the past, or `notBefore` is in the future. |
| `not-bound-to-call` | `session.callId` or `rtpFingerprint` does not match the live leg. |
| `consent-out-of-scope` | The receiver's intended processing exceeds the consent receipt's declared purpose / scope / jurisdiction. |
| `assurance-insufficient` | The assurance claim does not meet the receiver's policy for the requested action. |
| `risk-class-not-allowed` | The receiver does not accept the declared AI Act risk class for this audience purpose. |
| `prohibited-practice` | One of `governance.prohibited.*` is `true`. |
| `oversight-missing` | The receiver's policy requires a stronger oversight mode than the envelope declares. |
| `gpai-policy-missing` | A GPAI in `aiSystem.gpaiChain` with `systemicRisk=true` did not include a resolvable `policyUrl`. |
| `rate-limit` | Issuer key has exceeded the receiver's per-issuer envelope rate cap. |
| `unknown` | Catch-all; SHOULD include a free-text addendum. Use sparingly. |

### Fallback

The sender MAY declare a fallback in `control.fallback`. If the primary handoff is rejected for a reason listed in `fallback.acceptableReasons`, the sender will re-issue at a lower tier (if the workload's `minTier` allows) or to an alternate audience. Silent downgrade by the receiver is a conformance violation.

## L2 · Transport Bindings

The same envelope rides one of four bindings. Every binding MUST run over a confidential channel (TLS 1.3 / DTLS 1.3 / SRTP); transport security never substitutes for L1 field-level sealing.

| Binding | When to use | Carrier | Idempotency surface |
| --- | --- | --- | --- |
| `ohp/sip-info` | Active SIP call, telco-only path | SIP `INFO` with `Content-Type: application/ohp+cbor`, multi-part chunked if > 1300 bytes | `Call-ID` + `CSeq` |
| `ohp/ws` | Live AI-to-AI handoff, WebRTC or sidecar | WebSocket frames, `application/ohp+json` | Envelope `id` dedupe |
| `ohp/https` | Async handoff, queue join, post-call sync | `POST /ohp/v1/transfer`, JSON | `Idempotency-Key` header |
| `ohp/grpc` | Intra-region high-throughput control plane | Bidi streaming, protobuf mirror of JSON schema | Stream-scoped |

A conformant implementation MUST support at least one binding; full conformance requires all four. See [`07-transport-bindings.md`](./07-transport-bindings.md) for binding-level wire details.

## L1 · Trust, Identity & Crypto

Each tier adds primitives:

- **Signed** — detached Ed25519 JWS over canonical CBOR; JWKS publisher at `/.well-known/ohp-jwks.json`; envelope idempotency.
- **Sealed** — HPKE per-recipient sealing (X25519-SHA256-ChaCha20Poly1305); SD-JWT VC identity with selective disclosure; ISO/IEC 27560 consent receipts; DPoP sender constraint; RTP fingerprint binding.
- **Regulated** — hybrid Ed25519 + ML-DSA-65 signing (FIPS 204); Sigstore-style transparency log anchor; OpenID Federation 1.0 trust; full AI governance metadata.

See [`04-security-model.md`](./04-security-model.md) for the threat model and [`docs/09-trust-verification.md`](./09-trust-verification.md) for receiver-side verification order.

## L0 · Media Continuity

OHP carries an audio fingerprint (`session.media.rtpFingerprint`) used by the receiver to confirm that the envelope it is processing actually corresponds to the live RTP leg in front of it. This prevents envelope replay across different calls.

L0 is non-mandatory for Core (anonymous IVR) and SHOULD be present for Signed+. It is REQUIRED for Sealed+ before honouring any sealed field.

The fingerprint is a SHA-256 over a deterministic sample of the active RTP stream as defined in the spec. SDP re-INVITE hints (`session.media.sdpHints`) tell the receiver what codecs the live leg negotiated, so the receiver can prepare its media path before sending `ACCEPT`.

## Composition rules

1. An envelope MUST declare exactly one tier in `conformance`.
2. A receiver MUST refuse any envelope whose tier is below `audience.minTier`.
3. A receiver MUST refuse any envelope whose tier exceeds its advertised max at `/.well-known/ohp-capabilities.json`.
4. Receivers MUST NOT silently strip Sealed or Regulated fields they cannot process. They MUST `REJECT` with `tier-insufficient` and let the sender decide whether a lower-tier re-issue is acceptable.
5. Adoption of OHP at Core does not lock the deployment out of Signed/Sealed/Regulated later; tier upgrades are wire-compatible and do not require schema migration.

## Glossary cross-reference

For defined terms (CSE, idempotency, canonical CBOR, ULID, DPoP, etc.), see [`glossary.md`](./glossary.md).
