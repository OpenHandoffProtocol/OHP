# 10 · Compliance posture

> **Status:** Non-normative. This document maps OHP fields to the obligations a regulator or auditor will look for. It is not legal advice; deployers are responsible for their own assessments.

OHP encodes regulator-facing metadata into the wire format so an auditor presented with an envelope hash can reconstruct what was done and under what authority. This document maps each regulation to the OHP control that satisfies it and the residual obligation that remains with the customer.

## At-a-glance map

| Regulation | Jurisdiction / sector | OHP control that satisfies it | Residual customer obligation |
| --- | --- | --- | --- |
| **HIPAA / HITECH** | US healthcare | PHI fields HPKE-sealed; FHIR-reference-only; transparency log = audit trail (§164.312); receipt names BAA. | Customer signs BAA with each downstream OHP recipient; OHP enforces routing. |
| **PCI DSS 4.0** | Global, card payments | PAN/CVV prohibited; only network tokens or vault references (§3.4). Envelope stays out of CDE scope. | Customer maintains tokenisation provider relationship. |
| **GDPR / UK GDPR** | EU / UK | Lawful basis carried (Art 6); special-category basis (Art 9) where applicable; jurisdiction + retention enforced. | Customer designates DPO; OHP DSARs return envelope IDs the data subject was named in. |
| **PSD2 SCA** | EEA / UK payments | Dynamic linking via signed payment claim binding amount + payee; SCA AAL3 carried as assurance claim. | ASPSP issues the SCA token; OHP carries it unmodified. |
| **NHS DSPT** | UK healthcare | PHI sealed, retention ≤ DSPT cap, transparency log meets evidence requirement. | Customer publishes DSPT submission; OHP gives technical evidence pack. |
| **FCA Consumer Duty** | UK financial services | Vulnerable-customer flag carried as signed claim; suppression of cross-sell guardrail in `policy.guardrails`. | Customer defines vulnerability criteria; OHP propagates the flag. |
| **SOC 2 Type II** | Service org controls | Transparency log + DPoP-bound tokens + key rotation map to Security and Confidentiality TSCs. | Customer's own SOC 2 covers their boundary; OHP simplifies the integration boundary. |
| **FedRAMP Moderate / High** | US federal | FIPS 204 PQ signatures, FIPS 140-3 validated KMS for sealing keys. | Customer runs the reference implementation in a FedRAMP-authorised boundary. |
| **ISO 27701** | Global PIMS | Consent receipts (ISO/IEC 27560) + purpose binding map cleanly to PIMS controls. | Customer maintains records of processing; OHP supplies machine-readable receipts. |
| **EU AI Act** | EU — AI systems | Native: risk class, CE conformity, AIIA/FRIA refs, Art 5 attestation, Art 14 oversight state, Art 50 disclosure proof, Art 12 logging, Art 53 GPAI chain, Art 86 explanation endpoint, INCIDENT verb for Art 73. | Customer completes its own FRIA (Art 27) and registers as deployer; OHP carries the references and enforces routing. |
| **ISO/IEC 42001:2023** | Global AIMS | Native Annex A control evidence: A.5.2 AIIA, A.6.2.2 system id, A.6.2.6 monitoring, A.6.2.8 event logs, A.7.2 data, A.9.2/A.9.3 intended use + objectives, A.10.2/3 third parties. | Customer maintains the AIMS itself; OHP provides per-conversation evidence. |
| **ISO/IEC 23894** | AI risk management | AIIA / FRIA references in `governance.{aiia,fria}` tie each conversation back to risk-management records. | Customer runs the risk assessment process; OHP carries the artefact ID. |
| **NIST AI RMF 1.0** | US — voluntary AI risk | GOVERN/MAP/MEASURE/MANAGE functions all backed by envelope fields; transparency log provides MEASURE evidence. | Customer adopts profile; OHP supplies the per-system instrumentation. |

## Detail by regulation

### HIPAA / HITECH

OHP keeps PHI off the wire as cleartext entirely. The only PHI-related fields that may appear in a Sealed+ envelope are:

- FHIR resource references (e.g. `Patient/12345`) inside `sealed.ciphertext`
- A `caller.healthcare.bahCovered = true` flag (sealed) indicating the conversation is in BAA scope

§164.312(b) audit-trail requirements are met by the transparency log: every envelope hash is anchored, the BAA-named recipient holds a Signed Note, and the inclusion proof is verifiable by an auditor without the auditor needing to read the payload.

Residual: the customer must execute a BAA with each downstream recipient before that recipient appears in `audience.recipientKeys[]`. OHP cannot enforce a BAA exists, but it makes the recipient list cryptographically explicit.

### PCI DSS 4.0

OHP prohibits PAN, CVV, track data, and PIN in any field (§3 of PCI DSS 4.0). Card data references use network tokens (`intent.slots.card.ref`) issued by the customer's tokenisation provider. The envelope is therefore **out of CDE scope** — the receiver does not need to be CDE-attested to process the envelope, only to dereference the token through the tokenisation provider's own flow.

Residual: the customer maintains the relationship with their tokenisation provider.

### GDPR / UK GDPR

Lawful basis is carried in `caller.consent[].lawfulBasis`. Special-category data under Art 9 requires `specialCategoryBasis` to be set; OHP receivers MUST refuse special-category data when this is missing.

Cross-border transfer: `transferMechanism` (`scc` | `dpf` | `adequacy` | `uk-adequacy` | `none`) is mandatory whenever the envelope crosses an EEA/UK boundary.

Retention: `policy.retention.{transcript,audio,embeddings}` is honoured by the receiver. ISO 8601 durations.

DSAR fulfilment: a customer fulfilling a Subject Access Request returns the list of envelope `id`s the data subject appeared in, plus the IDs of any consent receipts referenced. OHP does not standardise the DSAR API in v0.1.

### PSD2 SCA

Dynamic linking under PSD2 RTS Art 5 requires the SCA token to bind the **specific amount and payee**. OHP carries this as a signed assurance claim with `aal = "AAL3"` and the payment payload sealed to the ASPSP recipient. The signed assurance over `(amount, payeeRef)` is part of the IdP's `proofJws`.

Residual: the customer's ASPSP issues the SCA token; OHP carries it unmodified.

### NHS DSPT

NHS Data Security and Protection Toolkit submissions require evidence of:

- Confidentiality of patient data (HPKE seal)
- Retention controls (`policy.retention`)
- Audit trail (transparency log)
- Authorised access (BAA-equivalent contracts named in consent receipt)

OHP provides a one-page evidence pack template (`docs/nhs-dspt-evidence-template.md`, planned for v0.2) that maps DSPT line items to OHP fields.

### FCA Consumer Duty

The vulnerable-customer flag is carried in `sealed.ciphertext` (revealed to authorised recipients only) and named in `sealed.fields` as `caller.vulnerable`. When `caller.vulnerable = true`, the customer's policy commonly suppresses the cross-sell guardrail and enables additional courtesy guardrails. OHP encodes these as:

```json
"policy": {
  "guardrails": ["no-cross-sell", "vulnerable-customer-extended-time"]
}
```

Residual: the customer defines its vulnerability detection criteria and is responsible for the legitimacy of the flag. OHP only propagates it.

### SOC 2 Type II

Mapping to AICPA Trust Service Criteria:

| TSC | OHP contribution |
| --- | --- |
| Security (CC) | DPoP-bound tokens, hybrid PQ signatures, HPKE seal, transparency log |
| Availability (A) | (Out of OHP scope — runs at the implementer's infrastructure layer) |
| Processing integrity (PI) | Canonical CBOR signing surface; detached JWS verification |
| Confidentiality (C) | HPKE seal, sealed memory hints, SD-JWT VC selective disclosure |
| Privacy (P) | Consent receipts (ISO/IEC 27560), `caller.consent[]`, retention policy |

Residual: SOC 2 is implementation-level; OHP simplifies the **integration boundary** that auditors typically struggle with on multi-vendor voice deployments.

### FedRAMP Moderate / High

Two specific OHP features matter for FedRAMP:

1. **FIPS 204 (ML-DSA-65) for envelope signing** — required at the Regulated tier. Combined with Ed25519 in a hybrid scheme so an existing FIPS 140-3 module signing Ed25519 stays compliant during transition.
2. **FIPS 140-3 validated KMS for sealing keys** — implementer-side; OHP does not specify the module but requires that the published JWKS reference a key whose backing module is FIPS-validated if the customer's compliance posture requires it.

Residual: customer runs the reference implementation in a FedRAMP-authorised boundary; OHP does not get the authority to operate on the customer's behalf.

### ISO 27701

ISO 27701 extends ISO 27001 to PII management. The relevant mappings:

| 27701 control | OHP field |
| --- | --- |
| 7.2 (Conditions for collection / processing) | `caller.consent[].purpose`, `lawfulBasis` |
| 7.3 (Obligations to PII principals) | `policy.retention`, DSAR id list |
| 7.5 (PII sharing, transfer, disclosure) | `transferMechanism`, `policy.dataResidency` |
| 8.x (Joint controllers / processors) | `issuer.aiRole`, `audience.purpose` |

Residual: customer maintains its records of processing; OHP supplies the machine-readable artefacts (consent receipts, retention policies) that feed those records.

### EU AI Act + ISO/IEC 42001

See [`05-ai-governance.md`](./05-ai-governance.md) for the full article-by-article and Annex A control map.

### ISO/IEC 23894 (AI risk management)

OHP carries the **artefact IDs** of AIIA and FRIA records (`governance.aiia.id`, `governance.fria.id`) and the `lastReviewedAt` timestamps so an auditor can confirm that risk management was performed within the receiver's required cadence.

Residual: customer runs the risk-management process itself.

### NIST AI RMF 1.0

| Function | OHP carry |
| --- | --- |
| GOVERN | `issuer.aiRole`, `governance.prohibited`, `policy.guardrails` |
| MAP | `aiSystem.{riskClass, annexIIIClause}`, `governance.aiia` |
| MEASURE | `decisions[]`, transparency log, `aiSystem.postMarketEndpoint` |
| MANAGE | `oversight.{mode, supervisor, escalation}`, `governance.fria` |

Residual: customer adopts the profile; OHP supplies the per-system instrumentation.

## What an audit looks like

Given an envelope hash, an auditor can:

1. Resolve the envelope from the transparency log (Regulated) or from the customer's local archive (lower tiers).
2. Verify both signatures (hybrid Ed25519 + ML-DSA at Regulated).
3. Resolve the issuer's federation entity statement at the relevant point in time.
4. Resolve each referenced consent receipt by `receiptId`.
5. Resolve `aiSystem.ceConformity.declarationUrl` and verify the model card hash.
6. Resolve `governance.aiia.uri` and `governance.fria.uri`.
7. Walk `decisions[]` and resolve each `rationaleRef` for Art 86 explanation.
8. Inspect `oversight.supervisor.identity` and confirm presence at `lastReviewAt`.
9. For high-risk routing, verify that the receiver's published Annex III allowlist included the envelope's `aiSystem.annexIIIClause`.

The auditor does **not** need to read sealed content to perform this audit — the audit is over the metadata, not the payload. This is what enables OHP to satisfy auditor needs without breaching the data-subject confidentiality the audit is checking.

## Disclaimer

This document is non-normative and is not legal advice. Compliance assessments are jurisdiction-specific and depend on facts OHP cannot know (e.g. the specific BAA, the specific authorisation boundary, the specific DPO determination). The customer is responsible for its own assessment. OHP provides machine-readable evidence; it does not provide certification.
