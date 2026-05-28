# 04 · Security model

> **Status:** Non-normative explanation. Cryptographic primitives, verification order, and conformance requirements are normative; see [`../spec/ohp-0.1.md`](../spec/ohp-0.1.md) §5 and [`09-trust-verification.md`](./09-trust-verification.md).

OHP is designed for envelopes that may carry verified caller identity, authentication assertions, ID&V outcomes, payment instructions, protected health information (PHI) and other regulated data. The security model is normative — an implementation that skips L1 is **not** OHP-conformant for any field above the minimum-disclosure baseline.

## Six security principles

Every conformant implementation MUST satisfy all six.

1. **Minimum disclosure.** The envelope carries claims and references, not secrets. Raw PAN, CVV, passwords, OTPs, full SSNs, biometric templates and free-form PHI are prohibited in any OHP field.
2. **Selective disclosure.** Identity claims use SD-JWT Verifiable Credentials so the receiver only sees the attributes it is contractually entitled to.
3. **End-to-end confidentiality.** Sensitive fields are HPKE-sealed per recipient public key; intermediaries route blobs they cannot read.
4. **Cryptographic provenance.** Every envelope is signed with a hybrid Ed25519 + ML-DSA (FIPS 204) detached JWS, sender-constrained by DPoP, and recorded in a Sigstore-style transparency log.
5. **Consent & purpose binding.** Each handoff carries an ISO/IEC 27560 consent receipt naming lawful basis, purpose, scope and jurisdiction; receivers MUST reject envelopes whose declared purpose exceeds the receipt.
6. **Time-bound & revocable.** Envelopes carry `notAfter ≤ 5 minutes`, are bound to a specific call leg, and reference revocable key/consent identifiers checked against an OCSP-style status endpoint.

## Threat model (STRIDE)

| Threat | Concrete attack on a voice handoff | OHP mitigation |
| --- | --- | --- |
| **Spoofing** | Rogue agent injects `PROPOSE` pretending to be the original IVR; receiver pops sensitive context to attacker. | Hybrid JWS over canonical CBOR + DPoP key binding + OpenID Federation trust chain; receiver MUST validate issuer against a federation policy before reading any sealed field. |
| **Tampering** | In-network proxy mutates intent or slot values mid-flight (e.g. changes payment amount). | Detached JWS covers a canonical CBOR serialisation; any byte change breaks signature. Sealed fields additionally have AEAD tags. |
| **Repudiation** | Vendor B later denies it received an authenticated transfer with a specific consent scope. | Every envelope hash is anchored to a public transparency log (rekor-compatible); both sides hold a non-repudiable Signed Note. |
| **Information disclosure** | Carrier or SBC logs SIP INFO body containing PHI; ops staff exfiltrate. | PHI / PCI fields are HPKE-sealed to receiver pubkey only. Intermediaries see opaque ciphertext. SIP INFO body is CBOR with sealed slots, not cleartext JSON. |
| **Denial of service** | Attacker floods a receiver with `PROPOSE` envelopes to exhaust crypto verification capacity. | Mandatory rate limit per issuer KID; envelope size cap (32 KiB JSON / 8 KiB CBOR); short PoW-style proof-of-bind for unfederated issuers. |
| **Elevation of privilege** | Lower-assurance AI agent (AAL1) hands off claiming AAL2 authenticated session to a banking specialist. | Assurance assertions are signed by an external IdP (not the sender). Receiver verifies the IdP signature and checks federation-published AAL caps. |
| **Replay** | Captured envelope replayed to a different call leg to impersonate the caller. | Envelope is bound to `session.callId` and audio `rtpFingerprint`; receiver MUST verify the live RTP fingerprint matches before honouring sealed fields. |
| **Side-channel memory leak** | Sender stuffs PII into `memory.embeddings` hoping receiver model leaks it. | Memory hints are HPKE-sealed and carry a model-id allowlist; receivers MUST drop hints not signed for their model family. |

## Cryptographic stack

| Concern | Primitive | Standard | Why this choice |
| --- | --- | --- | --- |
| Envelope signing | Hybrid Ed25519 + ML-DSA-65 detached JWS over canonical CBOR | RFC 7515 + draft-ietf-cose-pqc + FIPS 204 | Post-quantum hedged today; degrades to Ed25519 if receiver lacks PQ — never silently weakens. |
| Sealed-field confidentiality | HPKE (X25519-SHA256-ChaCha20Poly1305) per recipient | RFC 9180 | Multi-recipient encryption with forward secrecy; no shared secret distribution. |
| Sender constraint | DPoP-bound JWT for transport tokens | RFC 9449 | Stolen tokens cannot be replayed from a different key holder. |
| Selective disclosure of identity | SD-JWT VC with salted hashed disclosures | draft-ietf-oauth-sd-jwt-vc | Receiver gets exactly the attributes its purpose requires (e.g. name + AAL, not DOB). |
| Trust establishment between vendors | OpenID Federation 1.0 + `did:web` resolution | openid-federation-1_0 | No bilateral key exchange. Federation policy declares which issuers may assert which assurance levels. |
| Consent receipts | ISO/IEC 27560:2023 (Kantara CR v1.1 compatible) | ISO/IEC 27560 | Legally recognised receipt format; carries lawful basis and jurisdiction. |
| Non-repudiation log | Sigstore-style append-only Merkle log of envelope hashes | RFC 9162 (CT) / rekor | Tamper-evident audit trail readable by regulators without revealing payload. |
| Key management | JWK Set with `kid` rotation; separate sign + enc keys; HSM/KMS-backed | RFC 7517 + NIST SP 800-57 | Rotation without coordination; revocation via published JWK Set + short envelope lifetime. |
| Optional confidential compute | TEE attestation in `issuer.attestation` (Intel TDX / AWS Nitro) | draft-ietf-rats-eat | Healthcare and financial deployments can require attested execution before sealing. |

## Identity & assurance propagation

Assurance is **asserted by an external IdP** and **verified by the receiver** — never self-attested by the handing-off agent. OHP carries the IdP's signed claim, the verifier's entitlement to that claim, and the time of last step-up.

| Tier | NIST 800-63-3 | eIDAS LoA | Typical use | OHP carry |
| --- | --- | --- | --- | --- |
| IAL1 / AAL1 / FAL1 | Low | Low | Anonymous IVR self-service | Assurance block omitted; envelope MUST NOT carry sealed PII. |
| IAL2 / AAL2 / FAL2 | Moderate | Substantial | Verified phone + OTP, retail banking lookup | SD-JWT VC issued by tenant IdP; payment references allowed. |
| IAL3 / AAL3 / FAL3 | High | High | Voice biometric + hard token; PSD2 SCA dynamic linking; healthcare ID&V | SD-JWT VC + DPoP + TEE attestation; PHI fields MAY be HPKE-sealed. |

## What goes in the envelope vs what stays out

### In the envelope

- Assurance claims (signed by IdP), **not** credentials
- Account references and opaque tokens
- Card network tokens (`token_id`), **never** PAN / CVV
- FHIR resource references, **never** raw clinical notes
- Intent and slot values that the consent receipt permits
- Redacted transcript turns with explicit `[REDACTED:<tag>]` placeholders
- Consent receipt IDs (resolvable, not the receipt body)
- Retention policy and jurisdiction

### Never in the envelope

- Raw PAN, CVV, track data, PIN (PCI DSS 4.0 §3)
- Passwords, OTPs, MFA codes, recovery codes
- Full SSN / NI number / national ID (only last-4 derived claim)
- Biometric templates (claim of match, not the template)
- Free-form clinical notes, diagnoses, medication lists (HIPAA §164.514)
- Raw audio (`media.audio` is fingerprint-only; clip references require a separate BAA-gated channel)
- Model weights or training-grade data
- Cross-jurisdiction PII without a lawful-transfer claim (SCC / DPF / adequacy)

## Trust verification flow

Summary of what the receiver does before reading a sealed field. The detailed step-by-step is in [`09-trust-verification.md`](./09-trust-verification.md).

1. **Resolve issuer** — federation entity statement, reject if not in policy.
2. **Verify hybrid JWS** — both Ed25519 + ML-DSA over canonical CBOR.
3. **Check freshness** — `notBefore ≤ now ≤ notAfter` (≤ 5 min window).
4. **Bind to call leg** — `session.callId` + `rtpFingerprint` match live media.
5. **Resolve consent** — scope ⊇ requested purpose, jurisdiction permits transfer.
6. **Check assurance** — IdP signature on assurance block + federation cap.
7. **Decrypt sealed fields** — HPKE-open only the recipient slot keyed to this receiver.
8. **Anchor to log** — submit envelope hash to transparency log; persist Signed Note.

### Failure mode: degraded handoff

If any step 1–6 fails, the receiver MUST refuse the handoff and emit a `REJECT` verb with a structured reason. Falling back to a lower-assurance flow is allowed only when the sender explicitly declared a fallback in `control.fallback` **and** the lower flow does not require fields that just failed verification. **Silent downgrade is a conformance violation.**

## Operational requirements

| Concern | Requirement |
| --- | --- |
| Envelope lifetime | `notAfter - issuedAt ≤ PT5M`. Receivers reject longer windows even if signature valid. |
| Key rotation | Issuers MUST publish JWKS with `kid`; rotation cadence ≤ 90 days for sign keys, ≤ 30 days for enc keys. |
| Key revocation | Revoked `kid`s remain in JWKS for the longest envelope lifetime + clock-skew margin (default: 1 hour). Receivers MUST treat absence of a `kid` from current JWKS as revoked. |
| Rate limiting | Receivers MUST enforce per-issuer-`kid` rate limits and respond `REJECT reason=rate-limit` when exceeded. |
| Envelope size cap | 32 KiB serialised JSON; 8 KiB canonical CBOR for signed bytes. Larger payloads MUST be moved out-of-band and referenced. |
| Transparency log | Each envelope MUST be anchored before `PROPOSE` is sent. Receivers MAY independently verify the inclusion proof. |
| HSM / KMS | Signing and sealing keys SHOULD be backed by FIPS 140-3 validated hardware where the customer's compliance posture requires it. |

## Known assumptions (not vulnerabilities)

The following are explicit assumptions of the security model; reports against these are out of scope unless they include a concrete OHP-specific exploitation path. See [SECURITY.md](../SECURITY.md#known-security-assumptions) for the full list.

- Identity assurance is signed by an external IdP, not by the sender.
- Transparency log integrity inherits standard CT/Rekor assumptions about witness co-signing.
- Canonical CBOR is the signed surface; re-serialisation in transit is safe, byte changes break signatures.
- RTP fingerprint binding is the only L0 continuity check; attackers who can mint matching RTP can replay envelopes during their short lifetime.
