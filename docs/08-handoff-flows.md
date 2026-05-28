# 08 · Handoff flows

> **Status:** Non-normative explanation. Verb sequences are normative; see [`../spec/ohp-0.1.md`](../spec/ohp-0.1.md) §3.

OHP defines four canonical handoff flows. The verbs and envelope are identical across all four — only the participants, transport, and triggering reason change. Worked examples for each flow are in [`../examples/flows/`](../examples/flows/).

## Flow summary

| Flow | Trigger | Verbs | Transport | Continuity |
| --- | --- | --- | --- | --- |
| **A** — AI/IVR → Live human agent | low-confidence \| human-requested \| policy | `PROPOSE → ACCEPT → ASSUME` | `ohp/sip-info` during a warm SIP REFER | L0 SDP re-INVITE; CTI screen-pop |
| **B** — AI vendor A → AI vendor B | skill routing \| capacity \| language switch | `PROPOSE → ACCEPT → ASSUME → (RETURN)` | `ohp/ws` | Receiving agent rehydrates intent stack + slots |
| **C** — IVR → Contact-centre queue | queue routing decision | `PROPOSE → REJECT → PROPOSE` | `ohp/https` | CSE persisted on CC ticket |
| **D** — Cross-channel resume (voice ↔ chat ↔ video) | caller hangs up mid-flow, returns on web chat | `ASSUME` with prior envelope id | `ohp/https` | Envelope keyed by `accountRef` + `intent.current` |

## Flow A — AI/IVR → Live human agent

### Trigger

The agent decides (or policy mandates) that the caller should reach a human. Common triggers:

- `intent.confidence < threshold`
- Caller explicitly requested `"speak to a human"`
- Workload policy: payment >£500, vulnerable-customer flag, escalation rule

### Verb sequence

```
Sender (AI/IVR)                    Receiver (CC agent runtime)
───────────────                    ───────────────────────────
  │
  │  ohp/sip-info: PROPOSE  ─────▶ │
  │                                │ verify L1, L0; pop CTI
  │                                │
  │   ◀───── ohp/sip-info: ACCEPT  │
  │                                │
  │  ohp/sip-info: ASSUME  ─────▶  │
  │                                │
  │  (caller media flows to CC) ─▶ │
  │                                │
  X drops agent leg                │
```

### Transport choice

`ohp/sip-info` rides the existing SIP signalling for the warm transfer. The OHP envelope arrives **before** the SIP REFER so the CC has the screen-pop ready when the human picks up.

### Continuity

- L0: SDP re-INVITE keeps the audio path coherent during the leg swap.
- The human agent sees: caller name, account reference, intent summary, slot state, redacted recent turns — **before** the call appears on their screen.
- The human MUST NOT re-prompt for any information that was already verified at AAL2+.

### Example envelope

See [`../examples/envelopes/02-signed-cs-handoff.json`](../examples/envelopes/02-signed-cs-handoff.json) for a Signed-tier walkthrough.

---

## Flow B — AI vendor A → AI vendor B

### Trigger

- Skill routing — "this caller now needs a payments-specialist agent, owned by Vendor B"
- Capacity — Vendor A overloaded; Vendor B picks up
- Language switch — caller switched to a language Vendor A's model does not support

### Verb sequence

```
Sender (AI A)                      Receiver (AI B)
─────────────                      ───────────────
  │
  │  ohp/ws: PROPOSE  ───────────▶ │
  │                                │ verify; rehydrate state
  │                                │
  │   ◀────────── ohp/ws: ACCEPT   │
  │                                │
  │  ohp/ws: ASSUME ─────────────▶ │
  │                                │ takes the conversation
  │                                │ (caller hears B's voice)
  │                                │
  │                                │  (later, optional)
  │   ◀────────── ohp/ws: RETURN   │
  │ takes back control             │
```

### Transport choice

`ohp/ws` between vendor control planes; media stays in a shared SFU room so the audio leg never moves.

### Continuity

The receiving agent rehydrates `intent.stack` and `slots` **before** its first turn. The caller never hears "OK, can you tell me again what this is about?" — Vendor B's first utterance picks up exactly where Vendor A left off.

### `RETURN`

Optional. If Vendor B's specialised handling completes and the conversation should return to a generalist agent on Vendor A, B emits `RETURN` referencing the original envelope `id`. A's slot state, model memory and intent stack are updated with anything B added.

---

## Flow C — IVR → Contact-centre queue

### Trigger

A queue-routing decision: the conversation should join a CC queue (waiting for next available human or specialist team), not a specific agent.

### Verb sequence

```
Sender (IVR)                       Receiver (CC orchestrator)
────────────                       ──────────────────────────
  │
  │  ohp/https POST: PROPOSE ────▶ │
  │                                │ check capacity
  │                                │ (queue full)
  │   ◀────────── 200 OK: REJECT   │
  │   reason="over-capacity"       │
  │   altTarget="queue:tier-2"     │
  │                                │
  │  ohp/https POST: PROPOSE ────▶ │  (to alt queue)
  │                                │
  │   ◀────────── 202 Accepted     │
  │                                │  enqueue
```

### Transport choice

`ohp/https` to the CC orchestrator. The CC platform translates the envelope to its internal attached-data format for the agent desktop.

### Continuity

- CSE is persisted on the CC-side ticket; survives the call leg even if the caller drops and reconnects.
- When a human agent picks up from the queue, their CTI screen-pop is populated from the persisted CSE.

### `REJECT` with `altTarget`

When the receiver rejects with `over-capacity` or `routing`, it MAY include `altTarget` in the response envelope's `control` block. The sender's queue-routing policy MAY use that hint or its own logic for the retry.

---

## Flow D — Cross-channel resume

### Trigger

The caller hangs up mid-flow on voice, then returns via web chat (or vice versa). The new channel should resume from where the previous one ended, without re-authenticating from scratch.

### Verb sequence

```
Caller hangs up on voice
       │
       │   (some time passes)
       │
Caller starts web chat (Vendor C, chat platform)
       │
       │  ohp/https POST: ASSUME ──▶ │  (Vendor B, voice platform)
       │   refs prior envelope id    │
       │                             │
       │   ◀──── 200 OK: ACCEPT      │
       │                             │
       │  (chat session pre-populated)
```

### Transport choice

`ohp/https`, because the originating channel is not active anymore.

### Continuity

- Envelope keyed by `caller.identity.claimsRevealed.accountRef` (or another stable claim) + `intent.current.name`.
- Same slots resumed in the chat session.
- Identity assurance carries forward subject to the receiver's policy (a high-AAL voice session may step down to AAL2 in chat if biometric was the assurance method).

### Operational note

Cross-channel resume requires that both channels' OHP receivers agree on the lookup key. In practice this means the same tenant runs both channels, or a shared orchestrator brokers the lookup. OHP does not standardise the lookup directory in v0.1 — that may come in v0.2 as `ohp/.well-known/resume-lookup`.

---

## State machine

All four flows obey the same state machine on each side. Below is the sender's view; the receiver's view is the mirror image with verbs swapped.

```
            ┌──────────────┐
            │   IDLE       │
            └──────┬───────┘
                   │ build CSE
                   ▼
            ┌──────────────┐
            │   READY      │
            └──────┬───────┘
                   │ send PROPOSE
                   ▼
            ┌──────────────┐
   ACCEPT   │  PROPOSING   │  REJECT
   ┌────────┴──────────────┴────────┐
   ▼                                ▼
┌────────────┐                  ┌───────────┐
│ ACCEPTED   │                  │ REJECTED  │
└──────┬─────┘                  └─────┬─────┘
       │ send ASSUME                   │ retry / fallback / end
       ▼                                ▼
┌────────────┐                  ┌──────────────┐
│ HANDED OFF │ ─── RETURN ────▶ │ RESUMED      │
└────────────┘  (Flow B only)   └──────────────┘
```

Transitions:

| From | Verb | To |
| --- | --- | --- |
| READY | `PROPOSE` | PROPOSING |
| PROPOSING | `ACCEPT` (received) | ACCEPTED |
| PROPOSING | `REJECT` (received) | REJECTED |
| PROPOSING | timeout (`notAfter` reached) | REJECTED (`reason=stale`) |
| ACCEPTED | `ASSUME` (sent) | HANDED OFF |
| HANDED OFF | `RETURN` (received, Flow B) | RESUMED |
| REJECTED | fallback configured | READY (re-issue at lower tier or alt audience) |

### Timeouts

- A `PROPOSE` without a matching `ACCEPT` or `REJECT` by `notAfter` is considered rejected with `reason=stale`.
- An `ACCEPTED` envelope without an `ASSUME` within `PT10S` is considered abandoned; the receiver MAY emit a `REJECT` and release any resources held.
- Clock skew margin is 5 seconds across all timeouts.

---

## Worked walkthroughs

See [`../examples/flows/`](../examples/flows/):

- [A-ai-to-human.md](../examples/flows/A-ai-to-human.md)
- [B-ai-to-ai.md](../examples/flows/B-ai-to-ai.md)
- [C-ivr-to-queue.md](../examples/flows/C-ivr-to-queue.md)
- [D-cross-channel.md](../examples/flows/D-cross-channel.md)
