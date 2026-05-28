# Contributing to OHP

Thank you for your interest in the Open Handoff Protocol. OHP is published under [Apache-2.0](./LICENSE) and welcomes contributions from anyone — vendors, researchers, regulators, and end users.

This document explains:

1. What kinds of contributions are useful
2. How to propose a spec change
3. How to sign off on your contribution (DCO, no CLA)
4. The review and merge process

For governance (who decides, how versions are cut), see [GOVERNANCE.md](./GOVERNANCE.md).

---

## What you can contribute

| Type | Examples | Process |
| --- | --- | --- |
| **Typos, broken links, clarifications** | Fixing a sentence in `docs/`, updating a dead URL | Open a PR directly. |
| **Test vectors / examples** | New example envelope, fixture for a corner case | Open a PR with the JSON plus a one-line description in the directory README. |
| **Non-normative documentation** | New page in `docs/`, expanded prose for an existing section | Open a PR. |
| **Schema changes (non-breaking)** | Adding a new optional field, tightening a `pattern` that no existing example would violate | Open an issue first (template: *Spec change*), then PR. |
| **Schema changes (breaking)** | Renaming a field, changing a default, removing an enum value | Open an issue first; requires WG discussion and a minor version bump. See [GOVERNANCE.md](./GOVERNANCE.md). |
| **New transport binding** | Adding `ohp/mqtt`, `ohp/quic`, etc. | Open an issue first with rationale, security considerations, and at least one implementer committed. |
| **Security finding** | Vulnerability in the spec or a fixture | **Do not** open a public issue. Follow [SECURITY.md](./SECURITY.md). |

---

## Workflow

1. **Search existing issues and PRs** before opening a new one.
2. **For anything more than a typo, open an issue first** using one of the templates in `.github/ISSUE_TEMPLATE/`. This lets the WG agree on the shape of the change before you spend time on a PR.
3. **Fork, branch, push.** Branch names: `fix/<short-slug>`, `feat/<short-slug>`, `docs/<short-slug>`, `spec/<short-slug>`.
4. **Open a PR** against `main`. Fill in the PR template. Reference the issue.
5. **Sign off every commit** (DCO — see below).
6. **CI must be green.** Spec-text and JSON schemas are linted; examples are validated against the schema; fixtures are signed and verified.
7. **Review.** At least one WG maintainer must approve. Spec changes touching `spec/` or `schemas/` require two approvers, at least one from a non-authoring organisation.
8. **Merge.** Squash-merge into `main`. The squash commit message must also be signed off.

---

## Developer Certificate of Origin (DCO)

OHP uses the [Developer Certificate of Origin v1.1](https://developercertificate.org/) instead of a CLA. Every commit must be signed off with:

```
git commit -s -m "Your message"
```

Which appends:

```
Signed-off-by: Your Name <your.email@example.com>
```

By signing off, you assert:

> 1. The contribution was created in whole or in part by me and I have the right to submit it under the open source license indicated in the file; or
> 2. The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate open source license and I have the right under that license to submit that work with modifications, whether created in whole or in part by me, under the same open source license (unless I am permitted to submit under a different license), as indicated in the file; or
> 3. The contribution was provided directly to me by some other person who certified (1), (2) or (3) and I have not modified it.
> 4. I understand and agree that this project and the contribution are public and that a record of the contribution (including all personal information I submit with it, including my sign-off) is maintained indefinitely and may be redistributed consistent with this project or the open source license(s) involved.

If you forgot to sign off a commit, amend it:

```
git commit --amend --signoff
git push --force-with-lease
```

The DCO bot will flag missing sign-offs in PRs.

---

## Style guide

### Specification text (normative)

- Use [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) keywords in UPPERCASE: **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY**.
- Distinguish normative requirements from informative explanation. Wrap the latter in `> Note:` blocks.
- Keep field names in `backticks`.
- Cross-reference other sections with anchor links, not "see above".

### Documentation (non-normative)

- Markdown, one sentence per line where practical (helps diffing).
- ATX-style headings (`#`, not underline).
- Tables for matrices, not nested bullet lists.
- Code blocks must have a language tag.

### JSON / CBOR examples

- 2-space indent.
- Trailing newline.
- No comments in `examples/` files (JSON forbids them); explanatory prose lives in adjacent markdown.

### Schemas

- JSON Schema draft 2020-12.
- Every property has a `description`.
- Reusable structures live under `$defs`.
- Run `npm run lint:schemas` (planned) before pushing.

---

## Test vectors

Every change to `schemas/ohp-envelope.schema.json` MUST come with at least one new or updated test vector in `conformance/test-vectors/`. Vectors are grouped by tier:

```
conformance/test-vectors/
├── core/
├── signed/
├── sealed/
└── regulated/
```

Each vector is a directory containing:

- `envelope.json` — the input
- `expected.json` — verifier output (accept / reject + reason code)
- `README.md` — one paragraph: what this proves, and which spec section it traces to

---

## Versioning

OHP follows a `MAJOR.MINOR` scheme during the pre-1.0 phase:

- **Minor** bumps (0.1 → 0.2) for additive changes that don't break existing implementations of an older minor.
- **Major** bumps (0.x → 1.0) for breaking changes to required fields, semantics or verbs.

`ohp` field in the envelope is the wire-format version. Implementations declare their max supported version at `/.well-known/ohp-capabilities.json`.

See [CHANGELOG.md](./CHANGELOG.md).

---

## Questions

- General discussion: [GitHub Discussions](https://github.com/OpenHandoffProtocol/OHP/discussions)
- Working group meetings: see [GOVERNANCE.md](./GOVERNANCE.md)
- Private security reports: see [SECURITY.md](./SECURITY.md)
