# OHP — Open Handoff Protocol

> A vendor-neutral specification for handing off live voice conversations — context, intent, state, identity, consent and media — between voice AI agents, IVRs, contact centres and humans.

[Spec status: Public Draft](./spec/ohp-0.1.md)
[Version: 0.1](./CHANGELOG.md)
[License: Apache-2.0](./LICENSE)
[Conformance tiers: Core · Signed · Sealed · Regulated](./docs/03-conformance-tiers.md)

**Authoring org:** Cloudax · **Status:** Public Draft · **Spec version:** 0.1 · **Contact:** [enquiries@cloud.ax](mailto:enquiries@cloud.ax)

OHP is designed to be embedded in SIP, WebRTC and HTTP/WS control planes without forcing a single runtime, model or telephony provider. It is engineered from the first line for regulated-data flows: authentication state, ID&V outcomes, payment instructions, healthcare context and other sensitive personal data cross vendor boundaries with the same legal defensibility as a bank-to-bank ISO 20022 message.

---

## Positioning in one sentence

OHP is to voice agents what MCP became for tool use and what SIP REFER was for calls — a tiered wire format whose **Core** tier any vendor implements in three days, scaling cleanly through **Signed**, **Sealed** and **Regulated** tiers up to a deployment suitable for healthcare, payments and EU AI Act high-risk use cases, so a caller never has to repeat themselves again when crossing a vendor, channel, or agent boundary.

---

## The problem, quantified


| Statistic  | Meaning                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **68%**    | Callers asked to repeat info after IVR-to-agent transfer (Forrester, 2025)                                                      |
| **0**      | Industry standards covering AI-to-AI conversation state handoff                                                                 |
| **14**     | Disjoint vendor-specific handoff formats observed across major contact-centre platforms, CPaaS providers, and voice-AI runtimes |
| **~$0.40** | Avg added cost per call from re-authentication + re-discovery on warm transfer                                                  |


Sources: Forrester CX Index 2025; Cloudax internal call-log audit Q1 2026 (n = 412k SIP transfers); public vendor docs.

See [docs/01-problem-statement.md](./docs/01-problem-statement.md) for the full gap analysis against SIP, WebRTC, MCP, OVON Open Floor, CCXML/VoiceXML, CPaaS webhooks, contact-centre attached-data formats, and OpenTelemetry GenAI semconv.

---

## Architecture — five composable layers

OHP is intentionally layered. A vendor can adopt L4 alone (just the envelope) and still interoperate with a full implementation; each lower layer is optional but recommended.


| Layer  | Name                              | Summary                                                                                                                 |
| ------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **L4** | Conversation State Envelope (CSE) | Canonical JSON document. Versioned, content-addressed, redaction-aware. **The only mandatory layer.**                   |
| **L3** | Control Plane                     | Five verbs: `PROPOSE`, `ACCEPT`, `REJECT`, `ASSUME`, `RETURN`. Idempotent, ack-ed, replayable.                          |
| **L2** | Transport Bindings                | One of four bindings: `ohp/sip-info`, `ohp/ws`, `ohp/https`, `ohp/grpc`. Same payload over each.                        |
| **L1** | Trust, Identity & Crypto          | HPKE-sealed fields, SD-JWT VC, PQ-hybrid Ed25519 + ML-DSA signatures, ISO/IEC 27560 consent receipts, transparency log. |
| **L0** | Media Continuity                  | SDP re-INVITE hints, SFU track forwarding, optional audio-fingerprint continuity check.                                 |


Read more in [docs/02-architecture.md](./docs/02-architecture.md).

---

## Conformance tiers — adoption floor & ceiling

Each tier is a **strict superset** of the one below; an envelope MUST declare exactly one tier in `ohp.conformance`; receivers MUST advertise their highest supported tier at `/.well-known/ohp-capabilities.json`. Workloads declare the minimum tier required in `audience.minTier`, and that — not vendor preference — gates the handoff.


| Tier          | Mandatory surface                                                                                                                                   | Workloads unlocked                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Core**      | Signed JSON document with five verbs over TLS                                                                                                       | Anonymous IVR navigation, FAQ, scheduling, "where was I?" continuity                   |
| **Signed**    | + detached Ed25519 JWS over canonical CBOR, JWKS publisher, idempotency                                                                             | Authenticated non-PII customer service, signed provenance                              |
| **Sealed**    | + HPKE per-recipient sealing, SD-JWT VC identity, ISO/IEC 27560 consent receipts, DPoP, RTP fingerprint binding                                     | HIPAA PHI, PCI network tokens, AAL2/AAL3, cross-border PII                             |
| **Regulated** | + PQ-hybrid signing (Ed25519 + ML-DSA-65), transparency log, OpenID Federation, aiSystem registry, AIIA/FRIA, decisions[], Art 50/14/12/86 plumbing | EU AI Act Annex III high-risk, PSD2 SCA, healthcare with right-to-explanation, FedRAMP |


Read the full tier matrix and sender × receiver handshake in [docs/03-conformance-tiers.md](./docs/03-conformance-tiers.md).

> **The promise to small implementers** — if you can JSON-encode a struct and POST it over HTTPS, you have OHP-Core. Any vendor with a working voice agent today can ship Core in under a week.
>
> **The promise to regulated enterprises** — you can mandate `audience.minTier="sealed"` or `"regulated"` in your procurement contracts and have machine-enforceable refusal if a counterparty tries to hand off below that bar.

---

## Repository layout

```
.
├── README.md                       # This file
├── LICENSE                         # Apache-2.0
├── CONTRIBUTING.md                 # How to contribute (DCO-based)
├── GOVERNANCE.md                   # Working group + change control
├── SECURITY.md                     # Vulnerability disclosure
├── CODE_OF_CONDUCT.md              # Contributor Covenant 2.1
├── CHANGELOG.md                    # Versioned changes
├── spec/
│   └── ohp-0.1.md                  # Normative specification, v0.1
├── docs/
│   ├── 00-overview.md              # Non-normative introduction
│   ├── 01-problem-statement.md     # Why OHP exists; gap analysis
│   ├── 02-architecture.md          # Five composable layers
│   ├── 03-conformance-tiers.md     # Core / Signed / Sealed / Regulated
│   ├── 04-security-model.md        # Threat model + crypto stack
│   ├── 05-ai-governance.md         # ISO/IEC 42001 + EU AI Act
│   ├── 06-envelope.md              # CSE field reference
│   ├── 07-transport-bindings.md    # SIP-INFO, WS, HTTPS, gRPC
│   ├── 08-handoff-flows.md         # Four canonical flows (A–D)
│   ├── 09-trust-verification.md    # Receiver-side verification order
│   ├── 10-compliance.md            # Regulator-facing posture map
│   └── glossary.md                 # Defined terms
├── schemas/
│   ├── ohp-envelope.schema.json    # JSON Schema (draft 2020-12)
│   ├── ohp-envelope.cddl           # CDDL for canonical CBOR
│   └── well-known/
│       ├── ohp-capabilities.schema.json
│       ├── ohp-jwks.schema.json
│       └── ohp-ai-systems.schema.json
├── examples/
│   ├── envelopes/
│   │   ├── 01-core-ivr-handoff.json
│   │   ├── 02-signed-cs-handoff.json
│   │   ├── 03-sealed-payment.json
│   │   └── 04-regulated-healthcare.json
│   └── flows/
│       ├── A-ai-to-human.md
│       ├── B-ai-to-ai.md
│       ├── C-ivr-to-queue.md
│       └── D-cross-channel.md
├── conformance/
│   ├── README.md                   # How the test runner works
│   ├── test-vectors/
│   │   ├── core/
│   │   ├── signed/
│   │   ├── sealed/
│   │   └── regulated/
│   └── runner/
│       └── README.md
└── .github/
    ├── ISSUE_TEMPLATE/
    │   ├── bug_report.md
    │   ├── feature_request.md
    │   └── spec_change.md
    └── PULL_REQUEST_TEMPLATE.md
```

---

## Quick start

### 1. Read the spec

- Non-normative intro: [docs/00-overview.md](./docs/00-overview.md)
- Normative spec, v0.1: [spec/ohp-0.1.md](./spec/ohp-0.1.md)
- Field reference: [docs/06-envelope.md](./docs/06-envelope.md)

### 2. Look at an envelope

The simplest possible Core-tier envelope

```json
{
  "ohp": "0.1",
  "conformance": "core",
  "id": "cse_01HZX0R5N9V8W1QYK0XQM3R3K9",
  "issuedAt": "2026-05-28T13:42:11Z",
  "notAfter":  "2026-05-28T13:47:11Z",
  "issuer":   { "vendor": "vendor-a", "agentId": "asst_b3", "region": "uk-west" },
  "audience": { "vendor": "vendor-b", "purpose": "ai-vendor-handoff", "minTier": "core" },
  "session":  { "callId": "callid_2026K9", "channel": "voice/pstn", "locale": "en-GB" },
  "intent":   { "current": { "name": "dispute_charge", "confidence": 0.91 }, "stack": [] },
  "control":  { "verb": "PROPOSE", "reason": "human-requested", "nonce": "9f3b1a" }
}
```

Full examples for each tier are in `[examples/envelopes/](./examples/envelopes)`.

### 3. Implement Core in a long weekend

1. Emit the envelope above on transfer.
2. Speak one of the four [transport bindings](./docs/07-transport-bindings.md).
3. Honour the five [verbs](./docs/02-architecture.md#l3-control-plane).
4. Publish your max tier at `/.well-known/ohp-capabilities.json` (see [schema](./schemas/well-known/ohp-capabilities.schema.json)).

### 4. Run the conformance suite

```bash
# from the repo root
cd conformance
# see conformance/README.md for the test runner
```

---

## Status & roadmap

OHP is at **v0.1 Public Draft**. The spec is feature-complete for the four tiers but not stable: field names and minor schema details may still change before v1.0. See [CHANGELOG.md](./CHANGELOG.md) for what shipped and [GOVERNANCE.md](./GOVERNANCE.md) for the change-control process.


| Milestone                                                                                                      | Status      |
| -------------------------------------------------------------------------------------------------------------- | ----------- |
| **v0.1** — Public Draft, Cloudax Fabric reference impl, conformance runner, one contact-centre design partner | In progress |
| **v0.2** — Two outside implementers, public test fixtures, OVON vocabulary alignment                           | Open        |
| **v0.9 RC** — Frozen wire format, full test vector coverage                                                    | Open        |
| **v1.0** — Multi-vendor steering committee, IETF informational draft submitted                                 | Open        |


---

## Contributing

OHP is published under [Apache-2.0](./LICENSE) and accepts contributions under the [Developer Certificate of Origin](https://developercertificate.org/) (no CLA). See [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution model and [GOVERNANCE.md](./GOVERNANCE.md) for the spec-change process.

Security vulnerabilities? See [SECURITY.md](./SECURITY.md). Do not file a public issue.

---

## License

Specification text, schemas, examples and reference fixtures: [Apache-2.0](./LICENSE).