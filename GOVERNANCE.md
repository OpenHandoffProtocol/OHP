# OHP Governance

> **Status:** Public Draft (v0.1). The governance model described here applies to the pre-1.0 phase. Major changes are expected before v1.0 once outside implementers join the working group.

This document describes who maintains OHP, how decisions are made, and how the project evolves from a Cloudax-led draft into a multi-vendor standard.

---

## Principles

1. **Open by default.** All spec discussion happens in public issues, PRs, and recorded WG meetings. Private side-channels are not allowed for normative decisions.
2. **Vendor-neutral wire format.** No field, verb, or tier may name or favour a specific vendor or runtime.
3. **Implementer-driven.** A change that no one has implemented (or committed to implement) does not enter the spec.
4. **Reversible until 1.0.** Pre-1.0, anything can change. After 1.0, the wire format is frozen for the lifetime of that major version.
5. **Regulator-readable.** Every normative requirement that exists for compliance reasons cites the regulation (Article number, ISO clause, etc.) so an auditor can trace it.

---

## Project structure

### Phase 1 — Cloudax-led draft (v0.x)

OHP is currently maintained by Cloudax. During this phase:

- **Editors:** named in `MAINTAINERS.md` (Cloudax engineers + invited co-editors as they join).
- **Working Group:** open to anyone. Anyone may attend WG calls and open issues / PRs.
- **Decisions:** editors decide. Where editors disagree, the lead editor breaks ties.
- **Goal of the phase:** ship v0.1, recruit at least three non-Cloudax voice AI vendors as committed implementers, and transition to Phase 2.

### Phase 2 — Multi-vendor Working Group (v1.0+)

Once **three or more non-Cloudax organisations** have shipped at least OHP-Signed against `main`, the project transitions to a multi-vendor steering committee:

- **Steering Committee (SC):** one seat per implementing organisation, max nine seats. Cloudax retains one seat, not the chair.
- **Chair:** elected by the SC for a one-year term, renewable once. The chair sets the agenda and breaks ties but has no veto.
- **Editors:** appointed by the SC. Editors hold the pen on the spec text. Editor appointments require a 2/3 SC vote.
- **Decisions:** consensus where possible. Where consensus fails, simple majority of the SC, with chair tie-break. Any SC member may file a *formal objection* which is recorded in the meeting minutes and the PR.

### Standards-track aspirations

At v1.0, OHP intends to pursue parallel publication tracks. Decisions about which standards venues to engage with are deferred to the SC at that time. This repository remains the authoritative source for the spec text and the conformance suite regardless of any external publication.

---

## Change control

### What counts as a "spec change"

Any modification to:

- `spec/ohp-*.md`
- `schemas/**`
- Normative paragraphs in `docs/` (those containing MUST / MUST NOT / SHOULD / SHOULD NOT / MAY)
- The verb set, tier definitions, or trust-verification order

Non-spec changes (typos, examples, docs prose, conformance runner code) follow normal PR review and do not require WG approval.

### Process for a spec change

1. **File an issue** with the *Spec change* template. State the problem, proposed change, and at least one implementer who will adopt it.
2. **WG discussion** in the issue and (if scheduled) the next WG call. Minimum 10 calendar days open for comment.
3. **PR** with the change, referencing the issue, including:
   - Updated spec/schema text
   - Updated examples
   - New or updated test vectors
   - CHANGELOG entry
4. **Review.** During Phase 1: at least one editor + one non-Cloudax reviewer if the change is normative. During Phase 2: at least two SC member orgs.
5. **Merge.** Squash to `main`. The CHANGELOG entry is the canonical record.
6. **Release.** Spec versions are tagged (`v0.1`, `v0.2`, …). Each tag has a release note linking the merged PRs.

### Fast-track exceptions

The editors may fast-track a change without the 10-day window if:

- It is a **security fix** (see [SECURITY.md](./SECURITY.md)).
- It is a **demonstrable spec bug** (the spec contradicts itself, or contradicts a referenced standard) where the fix is mechanical.

Fast-tracked changes are still announced retroactively in the WG channel and CHANGELOG.

---

## Working Group meetings

- **Cadence:** every two weeks during Phase 1; weekly leading up to a release.
- **Format:** video call, recorded, minutes posted to the repo within 48 hours.
- **Open to all.** No registration required; agenda published 48 hours in advance in [Discussions](https://github.com/OpenHandoffProtocol/OHP/discussions). General enquiries: [enquiries@cloud.ax](mailto:enquiries@cloud.ax).
- **Minutes location:** `meetings/YYYY-MM-DD.md` (added in v0.2).

---

## Adoption roadmap

| Milestone | Definition of done |
| --- | --- |
| **v0.1** | Public Draft. Cloudax Fabric reference implementation. Conformance runner skeleton. One contact-centre design partner committed. |
| **v0.2** | Two outside implementers shipping at least OHP-Signed. Public test fixtures. Joint vocabulary alignment document with OVON Open Floor published in `docs/`. |
| **v0.9 RC** | Wire format frozen. All four tiers covered by test vectors. Three or more outside implementers shipping at least OHP-Sealed for non-trivial workloads. |
| **v1.0** | Multi-vendor Steering Committee formed and ratified. Editors appointed. Phase 2 governance live. |

---

## Trademark and naming

- The names "Open Handoff Protocol" and "OHP" are used to describe the specification published in this repository.
- Any implementer may state "Implements OHP-Core" / "OHP-Signed" / "OHP-Sealed" / "OHP-Regulated" provided their implementation passes the corresponding conformance vectors in `conformance/test-vectors/`.
- "Cloudax Fabric" is a Cloudax product name and is not part of the spec.

---

## Spec governance — operational summary

| Question | Phase 1 (now) | Phase 2 (v1.0+) |
| --- | --- | --- |
| Who holds the pen on spec text? | Cloudax editors | SC-appointed editors |
| Who decides on a contested change? | Lead editor | SC majority + chair tie-break |
| Who can attend WG calls? | Anyone | Anyone |
| Who can vote? | n/a (editors decide) | One vote per implementing org on the SC |
| How are versions cut? | Editor decision after CHANGELOG sign-off | SC ratification of release notes |
| How do we add a new transport binding? | Issue + PR + one implementer committed | Issue + PR + two implementers, SC majority |
| How is the spec licensed? | Apache-2.0 (no change at v1.0) | Apache-2.0 |

---

## Contact

- Spec questions: [GitHub Discussions](https://github.com/OpenHandoffProtocol/OHP/discussions)
- General enquiries: [enquiries@cloud.ax](mailto:enquiries@cloud.ax)
- WG calendar: posted in Discussions
- Security: [SECURITY.md](./SECURITY.md)
