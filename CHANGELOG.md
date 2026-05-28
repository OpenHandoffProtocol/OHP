# Changelog

All notable changes to the OHP specification, schemas, and reference fixtures are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses a `MAJOR.MINOR` versioning scheme during the pre-1.0 phase (see [GOVERNANCE.md](./GOVERNANCE.md#versioning)).

The `ohp` field in the envelope is the wire-format version. Implementations declare their max supported version at `/.well-known/ohp-capabilities.json`.

---

## [Unreleased]

### Added
- (placeholder) Items merged to `main` after the v0.1 tag will be listed here.

### Changed
- (placeholder)

### Deprecated
- (placeholder)

### Removed
- (placeholder)

### Fixed
- (placeholder)

### Security
- (placeholder — security-only changes are dual-listed here and in advisories)

---

## [0.1] — 2026-05-28

Initial **Public Draft** of the Open Handoff Protocol.

### Added

#### Specification
- Five-layer architecture: L4 Conversation State Envelope, L3 Control Plane, L2 Transport Bindings, L1 Trust/Identity/Crypto, L0 Media Continuity.
- Four conformance tiers: `core`, `signed`, `sealed`, `regulated`, each a strict superset of the previous.
- Five control verbs: `PROPOSE`, `ACCEPT`, `REJECT`, `ASSUME`, `RETURN`.
- Reserved verb: `INCIDENT` (Regulated only; EU AI Act Art 73 reporting).
- Four transport bindings: `ohp/sip-info`, `ohp/ws`, `ohp/https`, `ohp/grpc`.
- Four canonical handoff flows: A (AI → human), B (AI vendor → AI vendor), C (IVR → CC queue), D (cross-channel resume).

#### Trust & crypto (L1)
- Hybrid Ed25519 + ML-DSA-65 detached JWS over canonical CBOR (RFC 7515 + draft-ietf-cose-pqc + FIPS 204).
- HPKE per-recipient sealing using X25519-SHA256-ChaCha20Poly1305 (RFC 9180).
- DPoP sender constraint (RFC 9449).
- SD-JWT VC with salted hashed disclosures (draft-ietf-oauth-sd-jwt-vc).
- OpenID Federation 1.0 trust establishment with `did:web` resolution.
- ISO/IEC 27560:2023 consent receipts.
- Sigstore-style transparency log for envelope hashes (RFC 9162-style).
- JWK Set publisher at `/.well-known/ohp-jwks.json` with `kid` rotation.
- Optional TEE attestation in `issuer.attestation` (Intel TDX / AWS Nitro / draft-ietf-rats-eat).

#### AI governance
- `aiSystem` block carrying id, version, model-card hash, AI Act risk class, Annex III clause, CE conformity reference, GPAI chain, post-market monitoring endpoint.
- `governance` block carrying AIIA (ISO/IEC 42001 A.5.2), FRIA (EU AI Act Art 27), Art 5 prohibited-practice attestation, Art 50 disclosure proof, Art 86 explanation endpoint.
- `oversight` block carrying Art 14 human oversight mode, supervisor identity, escalation triggers.
- `decisions[]` array for Art 12 logging + Art 86 right-to-explanation hooks.

#### Schemas
- `schemas/ohp-envelope.schema.json` — JSON Schema draft 2020-12 covering all four tiers.
- `schemas/ohp-envelope.cddl` — CDDL for canonical CBOR encoding (used for signing).
- `schemas/well-known/ohp-capabilities.schema.json` — capabilities manifest.
- `schemas/well-known/ohp-jwks.schema.json` — JWK Set publisher.
- `schemas/well-known/ohp-ai-systems.schema.json` — AI system registry.

#### Examples
- `examples/envelopes/01-core-ivr-handoff.json` — minimal Core envelope.
- `examples/envelopes/02-signed-cs-handoff.json` — Signed envelope with detached JWS.
- `examples/envelopes/03-sealed-payment.json` — Sealed envelope with HPKE-sealed payment instruction and SD-JWT VC identity.
- `examples/envelopes/04-regulated-healthcare.json` — Regulated envelope with PHI references, AI governance metadata, and decisions chain.
- `examples/flows/A-ai-to-human.md`, `B-ai-to-ai.md`, `C-ivr-to-queue.md`, `D-cross-channel.md` — flow walkthroughs.

#### Conformance
- `conformance/test-vectors/` — directory structure for tiered test vectors.
- `conformance/README.md` — runner overview and acceptance criteria.

#### Repository plumbing
- Apache-2.0 LICENSE.
- CONTRIBUTING.md (DCO-based, no CLA).
- GOVERNANCE.md (Phase 1 Cloudax-led; Phase 2 multi-vendor SC at v1.0).
- SECURITY.md (private disclosure to `security@cloud.ax`).
- CODE_OF_CONDUCT.md (Contributor Covenant 2.1).
- `.github/ISSUE_TEMPLATE/` and `PULL_REQUEST_TEMPLATE.md`.

### Known gaps in v0.1

These are tracked as open issues; expected to land in v0.2:

- Negative test vectors (verifier rejects malformed envelopes) for all four tiers — partial.
- gRPC `.proto` mirror of the JSON Schema — placeholder only.
- Joint vocabulary alignment doc with OVON Open Floor — drafting.
- Reference test runner implementation (currently spec-only; see `conformance/runner/README.md`).
- Worked example for `INCIDENT` verb + Art 73 reporting clock.

### Notes for early implementers

- Field names and minor schema details may still change before v1.0; the verb set and tier structure are stable.
- Implementations claiming "OHP-Core" MUST pass every vector in `conformance/test-vectors/core/`. Same rule for Signed, Sealed, Regulated.
- The `ohp` field is "0.1" for any envelope conforming to this version of the spec.

[Unreleased]: https://github.com/OpenHandoffProtocol/OHP/compare/v0.1...HEAD
[0.1]: https://github.com/OpenHandoffProtocol/OHP/releases/tag/v0.1
