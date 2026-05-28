# Security Policy

OHP is designed to carry verified caller identity, authentication state, ID&V outcomes, payment instructions, healthcare context and other sensitive personal data across vendor boundaries. Vulnerabilities in the specification, schemas, or reference fixtures can have downstream impact on production voice systems handling regulated data. We treat security reports as the highest priority work in the project.

This document covers:

1. What is in scope
2. How to report a vulnerability privately
3. Disclosure timeline and credit
4. Out-of-scope items
5. Known security assumptions of the spec

---

## Scope

A security report is **in scope** if it concerns any of the following:

| Area | Examples |
| --- | --- |
| **Spec text** | A normative requirement that is exploitable as written (e.g. a verification step that an attacker can bypass while remaining conformant) |
| **JSON Schema / CDDL** | A schema that admits envelopes the spec considers invalid, or rejects valid ones in a way that enables denial-of-service |
| **Cryptographic stack** | Misuse of HPKE, SD-JWT VC, hybrid JWS, DPoP, or consent receipts (ISO/IEC 27560) as described in `docs/04-security-model.md` |
| **Trust verification order** | A reordering, omission, or short-circuit in the receiver-side verification flow (`docs/09-trust-verification.md`) that loses a security property |
| **Test vectors** | A fixture that an implementer would reasonably treat as a positive example but which contains an exploitable artefact |
| **Conformance runner** | A bug that lets a non-conformant implementation pass, or a conformant one fail unsafely |

Implementation-specific bugs (e.g. in Cloudax Fabric or any other implementer's code) are **not** in scope for this repository. Report those to the implementer's own security contact.

---

## Reporting a vulnerability

**Do not open a public GitHub issue, PR, or Discussion.**

Send a private report to:

- **Email:** `security@cloud.ax` *(PGP key fingerprint and full key published when the public repo lands; see `.well-known/security.txt` in this repo)*
- **GitHub Security Advisories:** [Report a vulnerability](https://github.com/OpenHandoffProtocol/OHP/security/advisories/new)

Please include:

1. A description of the vulnerability and its potential impact
2. The affected spec section, schema file, or fixture (with version / commit SHA)
3. A minimal reproduction (envelope JSON, sequence of verbs, key material if synthetic)
4. Any suggested mitigation
5. Whether you would like to be credited in the advisory, and how

You will receive an acknowledgement within **3 business days**.

---

## Disclosure timeline

We follow a coordinated disclosure model:

| Day | What happens |
| --- | --- |
| **0** | Report received; tracker opened privately; reporter acknowledged |
| **1–7** | Triage. Confirm severity (CVSS 3.1 + spec-specific impact). Identify affected versions and downstream implementers |
| **7–60** | Develop fix. Notify embargoed implementers (those who have opted into the advance-notice list) at least 14 days before public disclosure |
| **≤ 90** | Public advisory + spec patch released. CVE assigned via GitHub if applicable. CHANGELOG entry merged |

If the vulnerability is being actively exploited, the timeline collapses to whatever is needed to ship a fix safely.

If we cannot reproduce or disagree on severity, we will explain why and keep the channel open. Reporters may publicly disclose after **90 days** if no fix has shipped.

---

## Embargoed implementer notice list

Implementers shipping OHP in production may request to be on the embargo list by emailing `security@cloud.ax` from a domain matching their public OHP capabilities manifest (`/.well-known/ohp-capabilities.json`). They will receive advance notice of fixes under embargo, typically 14 days before public disclosure, in exchange for a commitment not to disclose to third parties during the embargo window.

---

## Out of scope

- Bugs in any specific OHP implementation (report to the implementer)
- Vulnerabilities in dependencies of the conformance runner itself (report upstream)
- Theoretical attacks on the underlying primitives (Ed25519, ML-DSA-65, HPKE, ChaCha20Poly1305) without a concrete OHP-relevant exploitation path — these belong upstream with the primitive's maintainers (IETF, NIST, etc.)
- Social-engineering attacks against implementers or operators
- Denial-of-service attacks that require unbounded resources from the attacker

---

## Known security assumptions

These are documented in `docs/04-security-model.md` and re-summarised here so that reporters can quickly tell whether they have found a vulnerability or an assumption:

1. **Identity assurance** (`caller.assurance.*`) is signed by an external IdP, not the sender. OHP cannot prevent a colluding IdP + sender from inflating assurance.
2. **HPKE recipient public keys** (`audience.recipientKeys[].kid`) are assumed to be reachable via the audience's JWK Set or federation entity statement. Stale or revoked keys are handled by short envelope lifetimes (`notAfter ≤ 5 min`) and OCSP-style status checks; they are not handled by inline revocation lists.
3. **Transparency log integrity** assumes a Sigstore-style append-only Merkle log with witness co-signing. A compromised log operator can still equivocate within the window before witnesses publish their roots. OHP does not solve this; it inherits the standard CT/Rekor assumptions.
4. **Canonical CBOR** is used for the signed bytes. Re-serialisation in transit is safe; any byte change in the canonical form breaks the signature. Implementations MUST canonicalise before signing and before verifying.
5. **RTP fingerprint binding** (`session.media.rtpFingerprint`) is the only continuity check OHP performs at L0. An attacker who can mint matching RTP can replay envelopes; mitigation is the combination of envelope lifetime + DPoP binding + transparency log.
6. **Sealed fields are model-allowlisted** for memory hints. Receivers MUST drop hints not signed for their model family. OHP does not prevent a permissively-allowlisted recipient from leaking memory hints via its own model.

If your report is a refutation of one of these assumptions, please say so explicitly — we want to know.

---

## Hall of fame

Once public advisories begin shipping, this section will credit reporters who opted in. Until then, it is intentionally empty.
