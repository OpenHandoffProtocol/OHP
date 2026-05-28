# 01 · Problem statement

> **Status:** Non-normative.

This document explains the gap OHP fills, why the gap exists, and why the existing standards stack — which already covers signalling, media, model-to-tool, agent discovery, IVR scripting, and observability — does not close it.

## The problem in one line

There is no industry-standard way for a live voice conversation to cross a vendor boundary without losing its context. Callers feel this every time they hear "for security, can you confirm your account number again?" after a warm transfer.

## The problem in numbers

| Metric | Value | Source |
| --- | --- | --- |
| Callers asked to repeat info after IVR-to-agent transfer | **68%** | Forrester CX Index 2025 |
| Industry standards covering AI-to-AI conversation state handoff | **0** | This document |
| Disjoint vendor-specific handoff formats observed in production | **14** | Cloudax internal audit Q1 2026 |
| Avg added cost per call from re-authentication + re-discovery on warm transfer | **~$0.40** | Cloudax internal call-log audit Q1 2026 (n = 412k SIP transfers) |

The 14 disjoint formats observed span major contact-centre platforms, CPaaS providers, and voice-AI runtimes. We deliberately do not name the vendors here — the problem is structural, not vendor-specific, and naming individual implementations would imply OHP is fixing somebody's bug rather than a missing layer.

## Why existing standards don't solve this

Every layer below the conversation already has a standard. The conversation itself does not. OHP fills exactly that gap and explicitly composes with the layers below it rather than replacing them.

| Standard | Layer it owns | What it does | Why it isn't enough |
| --- | --- | --- | --- |
| **SIP / SIP REFER** | Signalling | Sets up, transfers, tears down voice sessions. | No semantic payload — X-headers are ad-hoc, lossy across carriers, and capped at a few hundred bytes. |
| **WebRTC + DataChannel** | Media + side-channel | Transports audio and arbitrary bytes between peers. | Defines a pipe, not a schema. Each implementer invents its own JSON. |
| **MCP** | LLM ⇄ tools | Standardises how a model calls tools and reads resources. | Scoped to a single agent runtime; no notion of conversation, caller identity, or media handoff. |
| **OVON Open Floor** | Conversational agent discovery | Lets agents introduce themselves to one another. | High-level vocabulary; no audio/media binding, no telephony grounding, no consent or retention semantics. |
| **CCXML / VoiceXML** | Legacy IVR scripting | Declarative dialog control on telco IVR platforms. | Pre-LLM era; no model state, no embeddings, no streaming partials. |
| **CPaaS webhooks** | Per-vendor control plane | Vendor-specific JSON/XML emitted on call events. | Locked to one CPaaS; one-way; no place for AI state. |
| **Contact-centre attached data** | CC platform CRM context | Key-value blob travels with the call within one CC platform. | Doesn't cross vendor boundaries; not standardised; no AI-native fields. |
| **OpenTelemetry GenAI semconv** | Observability | Span attributes for LLM calls. | Read-only telemetry — not a runtime handoff envelope. |

## The missing layer

Nothing in the stack carries live conversation semantics — verified caller identity, intent stack, slot state, model memory hints, consent receipts and media continuity — across vendors, in a way a competing vendor would actually implement.

That is OHP's entire job.

## Why does the gap exist?

Two reasons, both historical:

1. **Voice predates AI.** SIP was designed in the 1990s for human-to-human calls switched by carriers. The semantic payload was the human voice. There was nothing else to carry.
2. **AI predates voice agents.** Tool-use protocols like MCP grew out of chat-style assistants, where there is no telephony grounding, no media leg, no identity assurance ladder, and no consent receipt.

The result is a stack where the signalling layer is rigorous, the model layer is rigorous, and the layer in between — the conversation itself, with its identity, intent, and consent — is whatever each vendor decided to ship that quarter.

## Why now

Three things changed in 2024–2026 that make OHP both possible and necessary:

1. **Voice AI became commercially significant.** A non-trivial share of inbound contact-centre traffic now meets an AI agent first. Warm transfers from AI to human, and AI to AI, are now the default path, not the exception.
2. **EU AI Act Article 50** requires every voice AI to disclose itself to the natural person it is interacting with. That disclosure has to survive a hand-off — which means it has to be carried on the wire — which means there has to be a wire format.
3. **Post-quantum cryptography** is now standardised (FIPS 204 / ML-DSA). A standard adopted now in regulated industries needs a hybrid signature scheme. Retrofitting one later is harder than starting with it.

## Adjacent work and how OHP composes with it

- **OVON Open Floor** — OHP and Open Floor are complementary. Open Floor handles agent-to-agent discovery and vocabulary alignment at a conceptual level. OHP carries the operational payload of a specific call across a vendor boundary. We intend to publish a joint vocabulary alignment document in `docs/` for v0.2.
- **MCP** — OHP envelopes can reference MCP tool calls inside the `decisions[]` array (`type: "tool.call"`) so an auditor can trace an AI's external actions during the call. OHP does not replace MCP for intra-runtime tool use.
- **OpenTelemetry GenAI semconv** — `decisions[]` and `transparency.logId` are designed to be exportable as OTel spans. OHP is the runtime envelope; OTel is the telemetry. They share field names where it makes sense.
- **ISO 20022** — OHP borrows the *posture* of ISO 20022 (a structured, signed, jurisdictionally aware message that crosses regulated institutional boundaries), not its schema. The analogy is "this is what 20022 is for inter-bank messages; OHP is for inter-vendor voice conversation hand-offs."

## What success looks like

- A small voice-AI vendor can ship OHP-Core in under a week and immediately interoperate with every other Core+ implementer.
- A regulated enterprise can write `audience.minTier="sealed"` into a procurement contract and have wire-level enforcement, replacing a multi-page questionnaire.
- A caller dialling a bank, being routed through an AI triage agent, transferred to a contact centre, and eventually escalated to a human specialist never repeats a piece of identifying information.
- A regulator presented with an envelope hash can reconstruct the full accountability picture for the call in minutes, not weeks.
