# OHP examples

This directory holds reference envelopes and worked flow walkthroughs.

## `envelopes/`

One file per tier. Each is a minimal, valid envelope that exercises the additions that tier introduces.

| File | Tier | Scenario |
| --- | --- | --- |
| [`envelopes/01-core-ivr-handoff.json`](./envelopes/01-core-ivr-handoff.json) | Core | Anonymous IVR transferring an FAQ conversation to a generalist agent. |
| [`envelopes/02-signed-cs-handoff.json`](./envelopes/02-signed-cs-handoff.json) | Signed | Authenticated customer service transfer with detached Ed25519 JWS. |
| [`envelopes/03-sealed-payment.json`](./envelopes/03-sealed-payment.json) | Sealed | Sealed payment-instruction handoff with HPKE-sealed slot + SD-JWT VC identity. |
| [`envelopes/04-regulated-healthcare.json`](./envelopes/04-regulated-healthcare.json) | Regulated | Healthcare conversation with PHI references, AI governance metadata, and a decisions chain. |

Signatures, JWS blobs, HPKE ciphertext, and consent receipt bodies are illustrative — they are not actual cryptographic artefacts. For test vectors with real signatures (synthetic keys), see [`../conformance/test-vectors/`](../conformance/test-vectors/).

## `flows/`

Step-by-step worked walkthroughs for each of the four canonical handoff flows.

| File | Flow | Description |
| --- | --- | --- |
| [`flows/A-ai-to-human.md`](./flows/A-ai-to-human.md) | A | AI/IVR → live human agent via SIP REFER. |
| [`flows/B-ai-to-ai.md`](./flows/B-ai-to-ai.md) | B | AI vendor A → AI vendor B via WebSocket. |
| [`flows/C-ivr-to-queue.md`](./flows/C-ivr-to-queue.md) | C | IVR → contact-centre queue via HTTPS. |
| [`flows/D-cross-channel.md`](./flows/D-cross-channel.md) | D | Voice → web chat cross-channel resume. |

## How to validate an example

```bash
# Using a JSON Schema CLI of your choice, e.g. ajv:
ajv validate -s ../schemas/ohp-envelope.schema.json -d envelopes/01-core-ivr-handoff.json
```

(The conformance runner will do this automatically; see [`../conformance/README.md`](../conformance/README.md).)
