# 05 · AI governance

> **Status:** Non-normative explanation. The `aiSystem`, `governance`, `oversight`, and `decisions[]` blocks and their gating rules are normative; see [`../spec/ohp-0.1.md`](../spec/ohp-0.1.md) §6.

OHP is the first voice handoff format engineered to be machine-readable for both the **EU AI Act** and **ISO/IEC 42001 AI Management System**. Each envelope carries the AI-system identity, role, risk class, prohibited-practice attestation, Article 50 transparency disclosure, Article 14 human oversight state, AIIA/FRIA reference and a per-decision provenance chain. A regulator, auditor or post-market monitor can reconstruct the full accountability picture for any conversation from the envelope alone.

## Why this section is not optional

Most voice AI use cases involving identity verification, payments, healthcare access, employment, education access, credit, insurance or essential public services fall under **Annex III high-risk** of the EU AI Act — triggering provider obligations under Articles 9–15 (risk mgmt, data governance, tech docs, record-keeping, transparency, human oversight, accuracy/cybersecurity), Article 26 deployer duties, Article 27 Fundamental Rights Impact Assessment, and Article 86 right to explanation. Article 50 separately requires every voice AI to disclose itself to the natural person it is interacting with. Penalties under Article 99 reach **€35M or 7% of global annual turnover**.

ISO/IEC 42001 is the implementation-side AIMS standard customers will be certified against. OHP encodes both so vendors do not have to invent the metadata layer themselves.

## AI Act risk classification carried in the envelope

| Risk tier (Art 5 / 6 / 50 / 51) | Typical voice handoff scenarios | OHP requirements on envelope |
| --- | --- | --- |
| **Prohibited** (Art 5) | Subliminal manipulation, social scoring, real-time biometric ID in public spaces, emotion recognition in workplace/education, sensitive-attribute biometric categorisation. | Envelope MUST carry signed `governance.prohibited.none` attestation; receivers MUST refuse handoff if any prohibited capability is asserted. |
| **High-risk** (Annex III) | Credit decisioning, insurance underwriting, employment screening, healthcare access, essential public services, law enforcement, migration/border, biometric ID/categorisation. | `aiSystem.riskClass="high"` + CE conformity reference + AIIA/FRIA ID + Art 14 oversight state + Art 50 disclosure proof + decision provenance MUST be present. |
| **Limited** (Art 50) | General customer service voice agent, scheduling, FAQ — most non-regulated voice AI flows. | Art 50 disclosure proof required; deepfake/synthetic-media marking required if applicable. |
| **Minimal** | Spam-filter style assists, internal tooling. | Risk class declared; no further obligations propagated. |

## Role mapping — who carries which obligation

Defined in Art 3 / 25 / 26.

| AI Act role | Defined as | OHP carry | Key obligation when handing off |
| --- | --- | --- | --- |
| **Provider** | Develops or places an AI system on EU market under own name (Art 3(3)). | `issuer.aiRole="provider"` + CE conformity reference + tech-doc URL | Arts 9–22 — must keep tech docs & logs, conformity assessment, post-market monitoring. |
| **Deployer** | Uses an AI system under own authority (Art 3(4)) — the call centre, bank, hospital running the agent. | `issuer.aiRole="deployer"` + FRIA reference (Art 27) + designated oversight contact | Art 26 — assign human oversight, monitor operation, log incidents, inform affected persons. |
| **Importer** | Places a non-EU provider's system in EU market (Art 3(6)). | `issuer.aiRole="importer"` + upstream provider chain | Art 23 — verify provider conformity before placing on market. |
| **Distributor** | Makes a system available without altering it (Art 3(7)). | `issuer.aiRole="distributor"` | Art 24 — verify CE marking present. |

## Transparency disclosure (Art 50)

Every voice agent interacting with a natural person MUST disclose that they are talking to an AI. OHP carries a **signed proof** of that disclosure so a downstream agent (human or AI) does not have to re-do it or take it on faith.

```json
"governance": {
  "art50Disclosure": {
    "disclosed": true,
    "at": "2026-05-28T13:38:05Z",
    "modality": "voice-prompt",
    "language": "en-GB",
    "transcript": "You are speaking to an AI assistant…",
    "ack": "implicit-continuation",
    "proofJws": "eyJ..."
  }
}
```

Field reference:

- `modality` — one of `voice-prompt` | `tts-preamble` | `dtmf`
- `ack` — one of `explicit-yes` | `implicit-continuation`
- `proofJws` — detached JWS by the issuer over the disclosure record

If `disclosed` is `false` and the channel reaches a natural person, the receiver MUST emit disclosure itself before the first turn.

## Human oversight state (Art 14)

High-risk AI requires effective human oversight. OHP makes the oversight posture machine-readable so a handoff cannot accidentally hand a high-risk decision to an unsupervised peer.

```json
"oversight": {
  "mode": "human-on-the-loop",
  "supervisor": {
    "presence": "live",
    "identity": "supervisor:9k...",
    "channelRef": "ohp:supervisor-bus"
  },
  "escalation": {
    "triggers": ["intent.confidence<0.6","slot.amount>500"],
    "verb": "PROPOSE",
    "target": "human-queue:tier-2"
  },
  "lastReviewAt": "2026-05-28T13:40:00Z"
}
```

Modes:

- `human-in-the-loop` — every consequential decision requires human sign-off before execution
- `human-on-the-loop` — human supervises live, can intervene
- `human-in-command` — human authorises start of session and can intervene; AI runs largely autonomously inside an authorised envelope

Receivers MUST refuse the handoff if their policy requires a stronger mode than the envelope declares.

## AI system identity, AIIA & GPAI chain

### `aiSystem`

```json
"aiSystem": {
  "id": "urn:vendor-a:asst:b3-2026-05",
  "version": "2026.05.27",
  "modelCardSha256": "sha256:...",
  "riskClass": "high",
  "annexIIIClause": "5(b)",
  "ceConformity": {
    "assessmentRoute": "self",
    "notifiedBodyId": null,
    "declarationUrl": "https://docs.example.com/doc/CE-2026-05.pdf",
    "validUntil": "2027-05-01"
  },
  "gpaiChain": [
    { "provider": "example-gpai", "model": "example-llm-2026-04", "systemicRisk": true,
      "policyUrl": "https://example.com/policies/gpai" },
    { "provider": "example-tts", "model": "example-voice-2026-01", "systemicRisk": false }
  ],
  "postMarketEndpoint": "https://api.example.com/v1/ohp/post-market"
}
```

### `governance`

```json
"governance": {
  "aiia": { "id": "aiia:vendor-a:asst-b3:2026-04",
            "lastReviewedAt": "2026-04-12",
            "residualRisk": "low",
            "uri": "ohp://aiia/vendor-a/asst-b3" },
  "fria": { "id": "fria:vendor-c:asst-b3:2026-04",
            "completedAt": "2026-04-18",
            "uri": "ohp://fria/vendor-c/asst-b3" },
  "prohibited": {
    "subliminalManipulation": false,
    "socialScoring": false,
    "rtBiometricIdPublic": false,
    "emotionRecognitionWorkplace": false,
    "sensitiveBiometricCategorisation": false,
    "attestationJws": "eyJ..."
  },
  "art50Disclosure": { "...": "see Transparency section" },
  "art86Explanation": {
    "available": true,
    "endpoint": "https://api.example.com/v1/ohp/explain"
  }
}
```

## Per-decision provenance

Every consequential AI decision in the conversation — slot assignment, intent classification, transfer routing, payment authorisation — gets a structured record. The transparency log (from L1) anchors the bundle, so an affected person exercising Art 86 right to explanation gets a tamper-evident chain.

```json
"decisions": [
  {
    "id": "dec_01HZX...A1",
    "at": "2026-05-28T13:39:42Z",
    "type": "intent.classification",
    "input": { "turnIds": ["t_07","t_08"] },
    "output": { "intent": "dispute_charge", "confidence": 0.91 },
    "model": "urn:vendor-a:asst:b3-2026-05",
    "rationaleRef": "ohp:rationale:dec_01HZX...A1",
    "humanReviewed": false
  },
  {
    "id": "dec_01HZX...A2",
    "at": "2026-05-28T13:41:11Z",
    "type": "routing.decision",
    "input": { "intent": "dispute_charge", "slots.amountGBP": 42.50 },
    "output": { "target": "human-queue:tier-2", "reason": "policy: amount>0 dispute" },
    "humanReviewed": true,
    "reviewer": "supervisor:9k..."
  }
]
```

Defined decision `type` values include:

- `intent.classification`
- `slot.assignment`
- `routing.decision`
- `payment.authorisation`
- `assurance.step-up`
- `tool.call`
- `policy.refusal`
- `escalation`

## ISO/IEC 42001:2023 Annex A control map

OHP fields map directly to AIMS controls so an ISO 42001 audit can use the envelope itself as evidence rather than separate per-system documentation.

| Annex A control | Title | OHP field carrying evidence |
| --- | --- | --- |
| A.2.2 | AI policy | `policy.guardrails` + signed issuer identity links to org AI policy URI |
| A.5.2 | AI system impact assessment process | `governance.aiia.{id,lastReviewedAt,residualRisk,uri}` |
| A.5.4 | Assessing societal impacts | `governance.aiia.uri` + linked impacted-groups appendix |
| A.6.2.2 | AI system requirements | `aiSystem.{id,version,modelCardSha256}` |
| A.6.2.5 | AI system deployment | `aiSystem.ceConformity` + transparency log entry on first call |
| A.6.2.6 | AI system operation & monitoring | `decisions[]` + transparency log anchoring |
| A.6.2.8 | AI system recording of event logs | All envelopes hash-anchored to `transparency.logId` (L1) |
| A.7.2 | Data for AI systems | `policy.dataResidency` + redaction policy + `caller.consent[].scope` |
| A.8.2 | System documentation & info for users | `aiSystem.ceConformity.declarationUrl` + model-card hash |
| A.9.2 | Intended use of AI system | `audience.purpose` bound by `caller.consent.purpose` |
| A.9.3 | Objectives for the responsible use of AI | `governance.prohibited.*` attestation |
| A.10.2 / A.10.3 | Suppliers / third-party components | `aiSystem.gpaiChain[]` |

## EU AI Act article map

| Article | Topic | OHP carry | Practical effect at handoff |
| --- | --- | --- | --- |
| Art 5 | Prohibited practices | `governance.prohibited` | Receiver MUST refuse if any flag `true`. |
| Art 6 + Annex III | High-risk classification | `aiSystem.{riskClass,annexIIIClause}` | High-risk requires the full governance block; receivers can refuse for non-allowlisted Annex III clauses. |
| Art 9 | Risk management system | `governance.aiia` + post-market monitoring endpoint | Stale AIIA (> 12 months) downgrades trust tier. |
| Art 10 | Data & data governance | `policy.dataResidency` + redaction policy + `caller.consent` | Receiver enforces residency on its side. |
| Art 11 | Technical documentation | `aiSystem.{modelCardSha256,ceConformity.declarationUrl}` | Receiver verifies hash matches published model card. |
| Art 12 | Record-keeping (automatic logs) | `transparency.{logId,leafHash}` + `decisions[]` | Every envelope is logged before send; regulators can audit without payload access. |
| Art 13 | Transparency to deployers | `aiSystem.gpaiChain` + model card hash | Deployer reads upstream provider info from envelope. |
| Art 14 | Human oversight | `oversight.{mode,supervisor,escalation}` | Receiver MUST reject if required oversight mode is absent. |
| Art 15 | Accuracy, robustness, cybersecurity | L1 trust layer + decision confidence values | L1 satisfies cybersecurity; accuracy reported per decision. |
| Art 26 | Deployer obligations | `issuer.aiRole="deployer"` + FRIA | Deployer-issued envelopes MUST include FRIA reference. |
| Art 27 | Fundamental Rights Impact Assessment | `governance.fria` | Required for Annex III deployers in public services / essential services. |
| Art 50 | Transparency to natural persons | `governance.art50Disclosure` | Receiver SHALL NOT re-prompt disclosure if a valid one is present. |
| Art 53 / 55 | GPAI & systemic-risk GPAI | `aiSystem.gpaiChain[]` with `systemicRisk` bit | Receiver can refuse if a systemic-risk GPAI is in the chain without its `policyUrl`. |
| Art 72 | Post-market monitoring | `aiSystem.postMarketEndpoint` | Receivers can POST observed anomalies back to issuer. |
| Art 73 | Serious incident reporting | Reserved control verb `INCIDENT` + transparency log entry | 15-day clock starts at issuance of `INCIDENT` envelope. |
| Art 86 | Right to explanation | `governance.art86Explanation.endpoint` + `decisions[]` | Affected person's reference number is the envelope `id`. |

## Receiver-side governance checks (extends L1 trust flow)

These run **after** the L1 cryptographic verification and **before** the receiver acts on intent / slot / sealed-field content. See [`09-trust-verification.md`](./09-trust-verification.md) for the integrated order.

1. **Risk class gate.** Read `aiSystem.riskClass`. If `high`, require `ceConformity`, AIIA, FRIA (deployer-issued), Art 14 oversight, Art 50 disclosure. Refuse if missing.
2. **Prohibited check.** Read `governance.prohibited.*`; refuse if any prohibited capability flag is `true`.
3. **Annex III allowlist.** Receiver compares `aiSystem.annexIIIClause` against its own allowlist; refuse outside-scope clauses.
4. **Disclosure verify.** Validate `art50Disclosure.proofJws` signed by issuer; if absent and channel reaches a natural person, receiver MUST emit disclosure itself before first turn.
5. **Oversight match.** If receiver's policy requires `human-in-the-loop` and envelope says `on-the-loop`, reject or escalate.
6. **GPAI policy.** For each entry in `aiSystem.gpaiChain` with `systemicRisk=true`, verify `policyUrl` resolves; otherwise refuse.
7. **Provenance anchor.** Anchor `decisions[]` hash chain into transparency log alongside the envelope hash.

## Net effect

A regulator landing on a single envelope hash can reconstruct: which AI system processed the call, under what risk class, with what AIIA/FRIA reference, what was disclosed to the caller and when, who supervised, what decisions the system made and why, which upstream GPAI models were in the chain, and whether the receiver downstream honoured every obligation. **No vendor-specific tooling. No log-stitching. One signed document.**
