# 03 · Conformance tiers

> **Status:** Non-normative explanation. The tier definitions, gating fields, and handshake rules are normative; see [`../spec/ohp-0.1.md`](../spec/ohp-0.1.md) §3.

OHP is layered so a small vendor can ship Core in a long weekend while a regulated enterprise can light up the full Regulated tier without changing the wire format. Each tier is a **strict superset** of the one below.

- An envelope MUST declare exactly one tier in `ohp.conformance`.
- Receivers MUST advertise their highest supported tier at `/.well-known/ohp-capabilities.json`.
- Workloads declare the minimum tier required in `audience.minTier`. That — not vendor preference — gates the handoff.

## OHP-Core — the adoption floor

A signed JSON document with five verbs over TLS. That is the entire mandatory surface. Anyone with a working voice agent today can implement OHP-Core in a long weekend and immediately stop forcing callers to repeat themselves at vendor boundaries.

### What it carries

| Field group | Purpose |
| --- | --- |
| `ohp`, `conformance`, `id`, `issuedAt`, `notAfter` | Envelope metadata |
| `issuer` | Vendor, agent id, region |
| `audience` | Recipient vendor, declared `purpose`, `minTier` |
| `session.callId`, `session.channel`, `session.locale` | Conversation grounding |
| `intent.current`, `intent.stack`, `intent.slots` | What the conversation is about |
| `transcript.summary` | Redacted short summary (no full transcript turns required at Core) |
| `control.verb`, `control.reason`, `control.nonce`, `control.fallback` | Handoff control |

### What it does **NOT** carry

- No PII
- No payment tokens (not even network tokens)
- No PHI
- No assurance claims
- No `decisions[]`
- No `sealed` block

Envelope is freely loggable. **Senders MUST refuse to issue Core if the workload requires any field above the Core baseline.**

### When this is enough

- Anonymous IVR navigation
- General FAQ
- Scheduling and booking flows
- "I lost the call, where was I?" continuity for non-regulated services

## OHP-Signed

Adds, on top of Core:

- Detached Ed25519 JWS over canonical CBOR (RFC 7515 + COSE rules)
- JWK Set publisher at `/.well-known/ohp-jwks.json`
- Envelope idempotency (`id` + `nonce` + 5-min lifetime), enforced by receivers

### Unlocks

- **Tamper-evidence and signed provenance.** Receivers can prove the envelope they processed was the one the sender issued.

### Now allowed in envelope

- Authenticated identity references (e.g. `accountRef`)
- Generic non-PII slot values

### Still forbidden

- No sealed PII
- No payment tokens
- No PHI

## OHP-Sealed

Adds, on top of Signed:

- HPKE (X25519-SHA256-ChaCha20Poly1305) per-recipient sealing
- SD-JWT VC identity with selective disclosure
- ISO/IEC 27560 consent receipts
- DPoP sender constraint
- RTP fingerprint binding (`session.media.rtpFingerprint` MUST match the live leg)

### Unlocks

- **Confidentiality for regulated fields.** Intermediaries route opaque bytes. Identity claims signed by an external IdP — the sender cannot inflate AAL.

### Now allowed in envelope

- HIPAA PHI (via sealed FHIR references — never raw clinical notes)
- PCI network tokens (token_id; never PAN/CVV)
- AAL2/AAL3 assurance claims
- Cross-border PII with a lawful-transfer claim (SCC / DPF / adequacy)

### Still forbidden

- No post-quantum signing (yet)
- No transparency log anchor
- No AI governance metadata (`aiSystem`, `governance`, `oversight`, `decisions[]`)

## OHP-Regulated

Adds, on top of Sealed:

- Hybrid Ed25519 + ML-DSA-65 signing (FIPS 204)
- Sigstore-style transparency log anchor
- OpenID Federation 1.0 trust establishment
- `aiSystem` registry block + model-card hash
- AIIA (ISO/IEC 42001 A.5.2) and FRIA (EU AI Act Art 27) references
- `decisions[]` chain for Art 12 logging + Art 86 explanation
- Art 50 disclosure proof
- Art 14 human oversight state
- Art 86 explanation endpoint reference
- `INCIDENT` verb available for Art 73 reporting

### Unlocks

- **Full EU AI Act conformance** for Annex III high-risk flows
- **ISO/IEC 42001 AIMS** evidence
- **Post-quantum hedge** (PQ + classical hybrid; degrades to classical if receiver lacks PQ)
- **Non-repudiable audit trail** via transparency log

### Now allowed in envelope

- EU AI Act high-risk decisioning hand-offs (Annex III credit, employment, healthcare access, …)
- PSD2 SCA payment authorisation
- Healthcare with Art 86 right-to-explanation
- Regulated AI deployments under formal audit

### Still forbidden

Nothing additional — this is the ceiling.

## Workload → minimum tier matrix

The receiver MUST consult `audience.minTier` and refuse if the envelope's `conformance` is below it. Senders MUST set `audience.minTier` based on the workload, not on what they think the receiver can handle.

| Workload | Min tier | Why |
| --- | --- | --- |
| Anonymous IVR navigation | **Core** | No identity, no PII, no regulated decisions. |
| Authenticated non-PII customer service | **Signed** | Account-reference continuity benefits from tamper-evident signature. |
| Retail finance, KYC continuity, GDPR special-category data | **Sealed** | Confidentiality across vendors required; AAL2+ identity must come from an IdP. |
| PCI payments (network tokens), PSD2 SCA | **Sealed** | Network tokens MUST be sealed per recipient; SCA AAL3 required. |
| HIPAA PHI, NHS clinical context | **Sealed** | FHIR references sealed to BAA-gated recipient keys. |
| EU AI Act Annex III high-risk (credit, employment, healthcare access, …) | **Regulated** | Art 12 logging + Art 14 oversight + Art 50 disclosure + Art 86 explanation all require Regulated-tier metadata. |
| GPAI-systemic-risk model in the chain | **Regulated** | Art 53 obligations on the chain require `aiSystem.gpaiChain` with `policyUrl`. |
| Public-sector / FedRAMP / NHS DSPT | **Regulated** | PQ hedge + transparency log required by current procurement guidance. |

## Sender × receiver handshake — what happens when tiers don't match

| Sender tier ↓ \ Receiver max → | Core | Signed | Sealed | Regulated |
| --- | --- | --- | --- | --- |
| **Core**      | accept | accept | accept | accept |
| **Signed**    | reject *(tier-insufficient)* | accept | accept | accept |
| **Sealed**    | reject | reject | accept | accept |
| **Regulated** | reject | reject | reject | accept |

**Reject** means: the receiver returns `REJECT` with `reason="tier-insufficient"` and its advertised max tier in the response envelope. The sender MAY then re-issue at a lower tier **only if** the workload's `minTier` allows it; high-risk workloads stay rejected. Receivers MUST NOT silently strip Sealed or Regulated fields they cannot process — that is a conformance violation.

## Capabilities manifest

Receivers publish `/.well-known/ohp-capabilities.json`:

```json
{
  "ohp": "0.1",
  "maxTier": "regulated",
  "bindings": ["ohp/sip-info", "ohp/ws", "ohp/https", "ohp/grpc"],
  "verbs": ["PROPOSE", "ACCEPT", "REJECT", "ASSUME", "RETURN", "INCIDENT"],
  "purposes": ["ai-vendor-handoff", "human-takeover", "queue-routing", "cross-channel-resume"],
  "jurisdictions": ["GB", "EEA"],
  "annexIIIAllowed": ["5(b)", "5(c)"],
  "gpaiPolicy": "https://example.com/policies/gpai",
  "contact": "ohp-ops@example.com"
}
```

Senders SHOULD fetch the manifest before the first envelope and respect its declared max tier, jurisdiction list, and Annex III allowlist.

## The promise to small implementers

> If you can JSON-encode a struct and POST it over HTTPS, you have OHP-Core. Any vendor with a working voice agent today can ship Core in under a week. You get interoperability with everyone else from day one, and you can adopt Signed / Sealed / Regulated as your customers' workloads demand them — without a wire-format change.

## The promise to regulated enterprises

> You can mandate `audience.minTier="sealed"` or `"regulated"` in your procurement contracts and have machine-enforceable refusal if a counterparty tries to hand off below that bar. No questionnaire. No quarterly attestation paperwork. The wire format itself refuses non-compliance.
