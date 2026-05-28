---
name: Spec change
about: Propose a change to the normative specification
title: "[spec] "
labels: spec-change, triage
assignees: ''
---

> Required before any PR that touches `spec/`, `schemas/`, or normative paragraphs in `docs/`. See [GOVERNANCE.md](../GOVERNANCE.md#change-control).

## Summary

One sentence describing the proposed change.

## Affected sections

- Spec section: `_____`
- Schema(s): `_____`
- Doc section: `_____`
- Tier(s): `_____`

## Problem

What is wrong, missing, or unclear in the current spec?

## Proposed change

Concrete text / schema / field-level proposal. If possible, write the new spec text in a form ready to copy into `spec/ohp-0.1.md`.

## Backwards compatibility

- [ ] Additive only (no existing implementation breaks)
- [ ] Breaking — requires minor version bump
- [ ] Breaking — requires major version bump
- [ ] Editorial only (no behavioural change)

Explain why.

## Committed implementer(s)

Per [GOVERNANCE.md](../GOVERNANCE.md), spec changes require at least one implementer who has committed to adopting the change.

- Implementer 1: `_____`
- Implementer 2 (recommended for normative changes): `_____`

## Security implications

Does this change affect the threat model in [`docs/04-security-model.md`](../docs/04-security-model.md) or the verification flow in [`docs/09-trust-verification.md`](../docs/09-trust-verification.md)?

- [ ] No
- [ ] Yes — describe below

If yes, what changes? Have you considered whether the change should be coordinated with a security advisory?

## Compliance implications

Does this change affect any of the obligations mapped in [`docs/10-compliance.md`](../docs/10-compliance.md) or [`docs/05-ai-governance.md`](../docs/05-ai-governance.md)?

- [ ] No
- [ ] Yes — describe below

## Conformance vector

Spec changes MUST come with at least one new or updated test vector. Sketch the vector here.

- Tier: `_____`
- Type: `accept-positive` / `accept-negative` / `emit-positive` / `emit-negative`
- What it proves: `_____`

## Additional context

Prior discussion in other issues, references to adjacent standards, etc.
