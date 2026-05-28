# Glossary

Definitions of terms used throughout the OHP specification and documentation. Terms are listed in alphabetical order. Where a term has a precise definition in a referenced standard, the reference is given.

---

### AAL

Authenticator Assurance Level. NIST 800-63-3 §4. One of AAL1, AAL2, AAL3 in increasing strength. OHP carries the IdP-signed AAL claim under `caller.assurance.aal`.

### AIIA

AI Impact Assessment. ISO/IEC 42001:2023 Annex A.5.2. Periodic assessment of an AI system's impacts. OHP carries the AIIA identifier under `governance.aiia`.

### Annex III

The list of high-risk AI use cases in Annex III of the EU AI Act. OHP carries the specific Annex III clause under `aiSystem.annexIIIClause` (e.g. `"5(b)"` for credit decisioning).

### AAL3 dynamic linking

PSD2 RTS Art 5 requirement: the SCA token is bound to the specific amount and payee. OHP carries this as a signed assurance claim with `aal = "AAL3"`.

### Art 14

EU AI Act Article 14 — Human Oversight. OHP carries the receiver-facing oversight posture under `oversight`.

### Art 27

EU AI Act Article 27 — Fundamental Rights Impact Assessment. Required for Annex III deployers in public services / essential services. OHP carries the FRIA identifier under `governance.fria`.

### Art 50

EU AI Act Article 50 — Transparency obligations. Every voice agent interacting with a natural person MUST disclose that they are talking to an AI. OHP carries the signed disclosure proof under `governance.art50Disclosure`.

### Art 73

EU AI Act Article 73 — Serious incident reporting. OHP reserves the `INCIDENT` verb for issuing the report; the 15-day clock starts at envelope issuance.

### Art 86

EU AI Act Article 86 — Right to explanation. OHP carries an endpoint reference under `governance.art86Explanation.endpoint`. The affected person uses the envelope `id` as their reference number.

### Binding

A transport binding for OHP envelopes. One of `ohp/sip-info`, `ohp/ws`, `ohp/https`, `ohp/grpc`.

### Canonical CBOR

The deterministic CBOR serialisation used as the signing surface. RFC 8949 §4.2.1 (core deterministic encoding) plus OHP-specific rules in [`../spec/ohp-0.1.md`](../spec/ohp-0.1.md) §5.2.

### CE conformity

European Conformity assessment. OHP carries the assessment route, notified body ID (if applicable), declaration URL and validity date under `aiSystem.ceConformity`.

### Consent receipt

A receipt of consent under ISO/IEC 27560:2023 (Kantara CR v1.1 compatible). OHP references a consent receipt by `receiptId`; the receipt body is NOT inlined.

### Conformance tier

One of `core`, `signed`, `sealed`, `regulated`. Each tier is a strict superset of the one below. See [`03-conformance-tiers.md`](./03-conformance-tiers.md).

### CSE

Conversation State Envelope. The L4 document. See [`06-envelope.md`](./06-envelope.md).

### CSR (Center / Center Routing)

Not an OHP term. Where you see "CC" we mean contact centre.

### DID

Decentralised Identifier. OHP supports `did:web` resolution for issuer and audience identity. Other DID methods MAY be added in v0.2.

### DPoP

Demonstrating Proof of Possession (RFC 9449). Sender-constrained JWT for transport tokens. Required at Sealed+.

### Federation entity statement

The OpenID Federation 1.0 published statement that declares an entity's keys, policy, and trust chain. OHP receivers resolve issuer entity statements before honouring envelopes at Sealed+.

### FAL

Federation Assurance Level. NIST 800-63-3 §5. Strength of federation between a relying party and an IdP. OHP carries the FAL claim under `caller.assurance.fal`.

### FRIA

Fundamental Rights Impact Assessment. EU AI Act Art 27. OHP carries the FRIA identifier under `governance.fria`.

### GPAI

General Purpose AI model. EU AI Act Arts 53 / 55. OHP carries the chain of upstream GPAI providers under `aiSystem.gpaiChain[]`, with a `systemicRisk` bit per entry.

### HPKE

Hybrid Public Key Encryption (RFC 9180). Used for per-recipient sealing of sensitive fields at Sealed+.

### IAL

Identity Assurance Level. NIST 800-63-3 §4. Strength of identity proofing. OHP carries the IAL claim under `caller.assurance.ial`.

### Idempotency key

The envelope `id`, a ULID. Receivers MUST dedupe by this key for the envelope lifetime + clock-skew margin. The transport binding MAY echo it in a header (`Idempotency-Key` for HTTPS).

### Issuer

The party emitting the envelope. Identified by `issuer.vendor`, `issuer.did`, and optionally an attestation block.

### JWK / JWKS

JSON Web Key / JWK Set (RFC 7517). Issuers publish their public keys at `/.well-known/ohp-jwks.json`.

### JWS

JSON Web Signature (RFC 7515). OHP uses **detached** JWS over canonical CBOR as the signing surface.

### `kid`

Key identifier in a JWK. Used to address a specific key for signing or HPKE sealing.

### MCP

Model Context Protocol. The standard for an LLM calling tools inside one agent runtime. OHP composes with MCP — MCP tool calls inside the conversation appear in `decisions[]` with `type = "tool.call"`.

### ML-DSA-65

Module-Lattice-Based Digital Signature Algorithm, parameter set 65 (FIPS 204). The post-quantum signature scheme used in the Regulated-tier hybrid signature.

### Network token

A tokenised representation of a card PAN issued by the card scheme or a tokenisation provider. Allowed in `intent.slots.card.ref`. PAN itself is forbidden.

### `notAfter`

Envelope expiry. MUST be ≤ 5 minutes from `issuedAt`. Receivers reject stale envelopes.

### `notBefore`

Optional envelope earliest-honour time. Defaults to `issuedAt`.

### OpenID Federation 1.0

The trust establishment standard used by OHP at Sealed+ and Regulated. Receivers resolve issuer entity statements via the federation.

### Open Floor

The OVON Open Floor agent-discovery vocabulary. OHP composes with Open Floor; a joint vocabulary alignment document is planned for v0.2.

### `proofJws`

A detached JWS signed by an IdP (or issuer, for disclosure proof) over a specific claim. Used in `caller.assurance.proofJws` and `governance.art50Disclosure.proofJws`.

### RAR

Rich Authorization Requests (RFC 9396). The scope vocabulary used in `caller.consent[].scope`.

### Receiver

The party the envelope is addressed to via `audience`. Performs the verification flow in [`09-trust-verification.md`](./09-trust-verification.md).

### REJECT

One of the five control verbs. Receiver returns `REJECT` with a structured reason when verification fails or the envelope's tier is below the workload requirement.

### RTP fingerprint

A SHA-256 fingerprint over a deterministic sample of the active RTP stream. Used as L0 continuity check. Required match at Sealed+.

### SBC

Session Border Controller. The telco-side gateway that handles SIP signalling and media at network boundaries. OHP envelopes ride SIP INFO bodies precisely to survive SBC transit.

### SCA

Strong Customer Authentication. PSD2 RTS. Required for payment authorisation in EEA/UK. OHP carries SCA as a signed AAL3 assurance claim with dynamic linking.

### SD-JWT VC

Selective Disclosure JWT Verifiable Credential (draft-ietf-oauth-sd-jwt-vc). Used for `caller.identity.sdJwtVc`.

### Sealed

(a) The OHP conformance tier between Signed and Regulated. (b) The block in the envelope (`sealed`) carrying HPKE-encrypted fields.

### Signed

The OHP conformance tier between Core and Sealed. Adds detached JWS.

### Sigstore

A keyless signing and transparency-log ecosystem. OHP's transparency log is Sigstore-style (rekor-compatible) in v0.1.

### Slot

A named value extracted from the conversation (`intent.slots.X`). E.g. `chargeId`, `amountGBP`, `disputeReason`.

### Step-up

An increase in assurance during the conversation (e.g. moving from AAL1 to AAL2 after a successful OTP). OHP carries the time of the last step-up under `caller.assurance.lastStepUpAt`.

### Tier

See **Conformance tier**.

### Transcript redaction policy

A named, versioned policy describing how the transcript was redacted. Receivers re-redact on display. OHP v0.1 ships with `pii-mask+pci-drop+phi-mask` and `pii-mask+pci-drop` policies.

### Transparency log

An append-only Merkle log of envelope hashes. Tamper-evident audit trail readable by regulators without revealing payload. RFC 9162-style; rekor-compatible.

### ULID

Universally Unique Lexicographically Sortable Identifier. The format used for `id` fields. 26-character Crockford base32.

### Vendor

A short, lowercase, alphanumeric identifier for the implementer of an OHP endpoint. Carried in `issuer.vendor` and `audience.vendor`. Vendor identifiers are not registered; collisions are avoided by `did:web` resolution.

### Verb

One of `PROPOSE`, `ACCEPT`, `REJECT`, `ASSUME`, `RETURN`, `INCIDENT`. See [`02-architecture.md`](./02-architecture.md#l3-control-plane).
