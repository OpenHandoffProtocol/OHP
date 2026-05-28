# OHP Documentation

This directory contains the **non-normative** documentation for the Open Handoff Protocol. For the normative specification, see [`spec/ohp-0.1.md`](../spec/ohp-0.1.md).

## Reading order

| # | Doc | Purpose |
| --- | --- | --- |
| 00 | [Overview](./00-overview.md) | One-page introduction. Start here. |
| 01 | [Problem statement](./01-problem-statement.md) | Why OHP exists; gap analysis against existing standards. |
| 02 | [Architecture](./02-architecture.md) | The five layers (L0–L4). |
| 03 | [Conformance tiers](./03-conformance-tiers.md) | Core / Signed / Sealed / Regulated, handshake, workload matrix. |
| 04 | [Security model](./04-security-model.md) | Threat model, six principles, crypto stack. |
| 05 | [AI governance](./05-ai-governance.md) | ISO/IEC 42001 + EU AI Act on the wire. |
| 06 | [Envelope reference](./06-envelope.md) | Field-by-field reference for the CSE. |
| 07 | [Transport bindings](./07-transport-bindings.md) | SIP-INFO, WebSocket, HTTPS, gRPC. |
| 08 | [Handoff flows](./08-handoff-flows.md) | Four canonical flows (A–D). |
| 09 | [Trust verification](./09-trust-verification.md) | Receiver-side verification order. |
| 10 | [Compliance posture](./10-compliance.md) | What each regulation sees. |
| — | [Glossary](./glossary.md) | Defined terms. |

## How to cite a section

When opening an issue or PR, refer to a section by its file path and the heading anchor, e.g. `docs/03-conformance-tiers.md#sender--receiver-handshake`. The normative spec uses stable section numbers (e.g. *§3.2 Sender × receiver handshake*).
