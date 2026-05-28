# Maintainers

This file lists the editors and active maintainers of the Open Handoff Protocol specification during the pre-1.0 phase. The role and selection process is described in [GOVERNANCE.md](./GOVERNANCE.md).

## Lead editor

- **Cloudax** — [enquiries@cloud.ax](mailto:enquiries@cloud.ax)

The lead editor holds the pen on the spec text and breaks ties during Phase 1.

## Editors

Co-editors are added by invitation from the lead editor and announced in a CHANGELOG entry. Until additional editors are confirmed, the lead editor is the sole editor.

## Area maintainers

Area maintainers hold review responsibility for a specific layer or area of the repository. They do not need to be editors.

| Area | Maintainer(s) | Files |
| --- | --- | --- |
| L4 Envelope schema | _vacant_ | `schemas/ohp-envelope.schema.json`, `schemas/ohp-envelope.cddl` |
| L1 Trust & crypto | _vacant_ | `docs/04-security-model.md`, `docs/09-trust-verification.md` |
| L2 Transport bindings | _vacant_ | `docs/07-transport-bindings.md`, binding-specific examples |
| L0 Media continuity | _vacant_ | `docs/02-architecture.md#l0-media-continuity` sections |
| AI governance | _vacant_ | `docs/05-ai-governance.md`, `docs/10-compliance.md` |
| Conformance suite | _vacant_ | `conformance/**` |
| Documentation | _vacant_ | `docs/**`, `README.md` |

To volunteer as an area maintainer, open an issue with the *Spec change* template and the title `Proposal: area maintainer for <area>`.

## Inactive / emeritus

_(None yet.)_

---

## How to become a maintainer

Phase 1 (current): the lead editor invites co-editors and area maintainers based on demonstrated review activity and at least one upstreamed contribution accepted into `main`.

Phase 2 (v1.0+): the Steering Committee appoints editors. See [GOVERNANCE.md](./GOVERNANCE.md#phase-2--multi-vendor-working-group-v10).
