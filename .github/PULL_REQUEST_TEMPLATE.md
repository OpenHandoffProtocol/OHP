<!--
Thank you for contributing to OHP.

Before submitting, please make sure:
1. Every commit is signed off (DCO) — `git commit -s -m "..."`.
2. You have read CONTRIBUTING.md and (if this PR touches normative material) GOVERNANCE.md.
3. CI is green.
-->

## Summary

One sentence describing this PR.

## Linked issue

Closes #_____

(For normative spec changes, an issue with the *Spec change* template MUST be linked.)

## What changed

- [ ] Documentation (`docs/`, `README.md`, `CHANGELOG.md`, etc.)
- [ ] Spec (`spec/`)
- [ ] Schemas (`schemas/`)
- [ ] Examples (`examples/`)
- [ ] Conformance vectors (`conformance/test-vectors/`)
- [ ] Repo plumbing (`.github/`, `.gitignore`, etc.)

## Type of change

- [ ] Editorial / typo fix
- [ ] Non-breaking documentation improvement
- [ ] Additive schema change (non-breaking)
- [ ] Breaking change — requires version bump
- [ ] New conformance vector
- [ ] New / updated example
- [ ] Security fix (also followed [SECURITY.md](../SECURITY.md))

## Checklist

- [ ] Every commit is signed off (DCO).
- [ ] If touching schemas, every existing example still validates.
- [ ] If touching the spec, CHANGELOG.md is updated.
- [ ] If touching normative material, at least one implementer has committed to adopting the change (named in the linked issue).
- [ ] New / changed normative requirements use RFC 2119 keywords in UPPERCASE.

## Spec-change additions (only for normative changes)

### Affected tier(s)

- [ ] Core
- [ ] Signed
- [ ] Sealed
- [ ] Regulated

### Backwards compatibility

- [ ] Additive (existing implementations still work)
- [ ] Breaking — minor bump
- [ ] Breaking — major bump

### Conformance vectors added or updated

List the vectors:

- `conformance/test-vectors/<tier>/<dir>` — `_____`

## Reviewer notes

Anything reviewers should pay particular attention to?
