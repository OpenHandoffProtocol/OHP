# 00 · Overview

> **Status:** Non-normative. For binding requirements, see [`spec/ohp-0.1.md`](../spec/ohp-0.1.md).

The Open Handoff Protocol (OHP) is a vendor-neutral wire format for handing off a live voice conversation — context, intent, state, identity, consent and media continuity — between voice AI agents, IVRs, contact centres and humans. The hand-off can happen between two systems from different vendors, between two AI runtimes inside one vendor, or between any of those and a human agent.

OHP is designed to plug into the control planes that already carry voice today: SIP for the telco edge, WebRTC for browser/native runtimes, HTTP/WS for orchestration platforms, and gRPC for high-throughput intra-region traffic. It does not replace SIP, WebRTC, MCP, OVON Open Floor, CCXML, or any contact-centre platform's attached-data format. It composes with them by adding the missing layer above signalling and below business logic — the conversation itself.

## What OHP gives you

| If you are… | OHP gives you… |
| --- | --- |
| **A small voice-AI vendor** | A 3-day implementation path (OHP-Core) that makes you interoperable with every other implementer from day one. |
| **A contact-centre platform** | A way to receive a warm transfer from any AI vendor and pop the caller's identity, intent, slots, and a redacted transcript onto your agent's screen — without a bespoke integration per vendor. |
| **A regulated enterprise** | A machine-enforceable procurement clause (`audience.minTier="sealed"` or `"regulated"`) that refuses non-compliant hand-offs at the wire. |
| **A regulator or auditor** | A single signed envelope hash from which you can reconstruct: which AI system handled the call, under which risk class, with which consent receipt, what it decided and why, who supervised, and whether the receiver downstream honoured every obligation. |
| **A caller** | The end of "please verify your account number again" after every transfer. |

## What OHP is not

- **Not a runtime.** OHP does not specify how you build your agent, which model you use, or how you score intent. It specifies what crosses the wire when you hand off.
- **Not a media format.** Audio still flows over RTP / Opus / PCMU / whatever your SDP negotiates. OHP carries an audio *fingerprint* for continuity verification, not the audio itself.
- **Not a CRM schema.** OHP carries the *handoff envelope*, not the customer's entire history. The envelope references your CRM by stable identifiers.
- **Not a replacement for SIP / WebRTC.** OHP rides those bindings; it does not compete with them.
- **Not a replacement for MCP.** MCP is for an LLM calling tools inside one agent runtime. OHP is for one conversation crossing between agent runtimes (or to a human).

## The five-second mental model

```
┌───────────────────────────────────────────────────────────────┐
│  L4  Conversation State Envelope  (the document)              │
│  L3  Control Plane: PROPOSE / ACCEPT / REJECT / ASSUME / RETURN│
│  L2  Transport: SIP-INFO · WebSocket · HTTPS · gRPC           │
│  L1  Trust: HPKE seal · SD-JWT VC · PQ-hybrid JWS · log       │
│  L0  Media continuity: SDP re-INVITE · RTP fingerprint        │
└───────────────────────────────────────────────────────────────┘
```

L4 is the only mandatory layer. Every layer below it is optional but recommended; together they take you from "anonymous IVR FAQ" up to "HIPAA + PSD2 + EU AI Act Annex III high-risk".

## The four conformance tiers in one paragraph

A conformant envelope declares exactly one of four tiers in its `conformance` field. **Core** is plain signed JSON over TLS. **Signed** adds a detached Ed25519 JWS over canonical CBOR. **Sealed** adds HPKE per-recipient sealing, SD-JWT VC identity, ISO/IEC 27560 consent receipts, DPoP and RTP-fingerprint binding. **Regulated** adds post-quantum hybrid signatures, a transparency log, OpenID Federation trust, and the full EU AI Act / ISO 42001 governance block (risk class, AIIA/FRIA references, Art 50 disclosure, Art 14 oversight, `decisions[]`, Art 86 explanation endpoint, `INCIDENT` verb). Each tier is a strict superset of the one below; receivers MUST refuse handoffs whose tier is lower than the workload's `minTier`.

## A 60-second worked example

A caller phones their bank. The bank's IVR (Vendor A) authenticates the caller at AAL3 and detects intent `dispute_charge`. It needs to hand off to a human in a contact centre run by Vendor B.

1. **Vendor A** builds an OHP-Sealed envelope. Identity is an SD-JWT VC signed by the bank's IdP, disclosing only `given_name`, `accountRef`, and the AAL3 claim. The disputed charge details are HPKE-sealed to Vendor B's recipient key. The envelope is signed (Ed25519) and the hash is anchored to a transparency log.
2. **Vendor A** sends `PROPOSE` over `ohp/sip-info` as part of the SIP REFER flow. Audio continues unmodified through the shared SBC.
3. **Vendor B's** SBC strips the SIP INFO, routes the CBOR envelope to its OHP receiver. The receiver runs the verification flow ([`09-trust-verification.md`](./09-trust-verification.md)): issuer in federation policy, JWS valid, freshness OK, RTP fingerprint matches the live leg, consent scope covers `ai-vendor-handoff`, IdP-signed AAL3 claim verified, HPKE-open the sealed slot.
4. **Vendor B's** CTI screen-pops the human agent: caller name, account reference, "wants to dispute £42.50 charge from yesterday, already authenticated at AAL3". The agent does **not** ask the caller to re-verify.
5. **Vendor B** acknowledges with `ACCEPT`, then `ASSUME`. Vendor A's agent drops out of the call. The caller never noticed the seam.

Total wall-clock time added by OHP processing: ~80ms. Total questions the caller has to repeat: zero.

## Where to go next

- For a deeper explanation of *why* the existing standards don't already do this: [`01-problem-statement.md`](./01-problem-statement.md).
- For the field-by-field envelope reference: [`06-envelope.md`](./06-envelope.md).
- For the receiver's verification responsibilities: [`09-trust-verification.md`](./09-trust-verification.md).
- For the normative wire format: [`../spec/ohp-0.1.md`](../spec/ohp-0.1.md).
