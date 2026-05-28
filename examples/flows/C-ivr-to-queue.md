# Flow C — IVR → Contact-centre queue

> Worked walkthrough for the canonical "IVR hands off to a contact-centre queue, not a specific agent" flow. Normative state machine and verb semantics in [`../../docs/08-handoff-flows.md`](../../docs/08-handoff-flows.md).

## Scenario

A retail bank's IVR (Vendor A) authenticates the caller and identifies a complaint about a closed account. There is no specific human to route to yet; the conversation should join a contact-centre queue and wait for the next available specialist. The CC platform (Vendor B) accepts the envelope, persists it on the ticket, and pops it for whichever human eventually picks up.

## Participants

| Role | Vendor | Component |
| --- | --- | --- |
| Sender (issuer) | Vendor A | IVR `ivr_b3` |
| Receiver (audience) | Vendor B | CC orchestrator / queue manager |
| Eventual consumer | Vendor B | Human specialist (later) |

## Transport

`ohp/https`. The IVR `POST`s the envelope to the CC's `/ohp/v1/transfer` endpoint.

## Tier

**Signed.** Authenticated identity is present, but no PHI / PCI; Signed is sufficient.

## Sequence

```
Vendor A (IVR)                               Vendor B (CC orchestrator)
─────────────                                ──────────────────────────
      │
      │  POST /ohp/v1/transfer  ─────────▶  │  enqueue to "complaints"
      │  Idempotency-Key: cse_...A1         │  capacity check
      │  body: PROPOSE envelope             │  ───── full ─────▶ REJECT
      │                                     │
      │   ◀────────── HTTP 200 OK            │
      │   body: REJECT envelope             │
      │   reason="rate-limit"               │  ←── or "over-capacity"
      │   altTarget="queue:complaints-tier2"│
      │                                     │
      │  (Vendor A retries to alt queue)    │
      │                                     │
      │  POST /ohp/v1/transfer  ─────────▶  │
      │  body: PROPOSE (audience.purpose    │
      │         = "queue-routing",          │
      │         altQueueRef set)            │
      │                                     │
      │   ◀────────── HTTP 202 Accepted     │  enqueued
      │   body: ACCEPT envelope             │
      │                                     │
      │                                     │
      │  ──── caller hears hold music ────  │
      │                                     │
      │                       ... later ... │
      │                                     │  human specialist picks up
      │                                     │  CTI screen-pop from persisted CSE
      │                                     │  ASSUME emitted to in-room media
```

## The envelope

```json
{
  "ohp": "0.1",
  "conformance": "signed",
  "id": "cse_01HZX0Z9P0V7K2QY3M4N5R6T7B",
  "issuedAt": "2026-05-28T16:45:00Z",
  "notAfter":  "2026-05-28T16:50:00Z",

  "issuer": {
    "vendor": "vendor-a",
    "agentId": "ivr_b3",
    "region": "uk-west",
    "did": "did:web:agents.example.com:ivr_b3"
  },

  "audience": {
    "vendor": "vendor-b",
    "did": "did:web:cc.example.com",
    "purpose": "queue-routing",
    "minTier": "signed"
  },

  "session": {
    "callId": "callid_2026_C_complaint",
    "channel": "voice/pstn",
    "locale": "en-GB",
    "media": {
      "rtpFingerprint": "sha256:d4e5f6071829304a5b6c7d8e9f0a1b2c3d4e5f6071829304a5b6c7d8e9f0a1b2"
    }
  },

  "caller": {
    "consent": [
      {
        "receiptId": "iso27560:rcpt_bank_complaints_2026_05",
        "purpose": "queue-routing",
        "scope":   ["transcript.summary", "intent.slots:non-phi", "accountRef"],
        "lawfulBasis": "gdpr.art6.1.b",
        "jurisdiction": "GB",
        "transferMechanism": "uk-adequacy"
      }
    ]
  },

  "intent": {
    "current": { "name": "complaint", "confidence": 0.86 },
    "stack": [
      { "name": "authenticate", "status": "satisfied" }
    ],
    "slots": {
      "accountRef": "acc_***9921",
      "complaintCategory": "closed-account-charges",
      "preferredOutcome": "refund"
    }
  },

  "transcript": {
    "format": "ohp.turns/v1",
    "redaction": { "policy": "pii-mask+pci-drop", "version": "1.1" },
    "turns": [
      { "t": "2026-05-28T16:42:50Z", "role": "caller", "text": "I want to complain about charges on a closed account." },
      { "t": "2026-05-28T16:42:58Z", "role": "agent",  "text": "I'll get someone to help with that. One moment." }
    ],
    "summary": "Caller (acc_***9921) wishes to complain about charges on a closed account; queued for complaints-tier1."
  },

  "policy": {
    "retention": { "transcript": "P90D", "audio": "P0D", "embeddings": "P30D" },
    "redaction": { "pii": "mask", "pci": "drop", "phi": "drop" },
    "guardrails": ["no-cross-sell"],
    "dataResidency": ["GB"]
  },

  "control": {
    "verb": "PROPOSE",
    "reason": "queue-routing",
    "fallback": {
      "verb": "PROPOSE",
      "after": "PT2S",
      "acceptableReasons": ["over-capacity", "rate-limit"]
    },
    "nonce": "4e5f60718293a4b5"
  },

  "signatures": [
    { "kid": "ck_vendor_a_2026_05_ed", "alg": "EdDSA", "jws": "eyJ...PLACEHOLDER" }
  ]
}
```

## What the CC orchestrator does on receipt

1. Run the standard 6-step Sealed-tier-and-below verification flow.
2. Look up the requested queue (`audience.purpose = "queue-routing"` + slot hints).
3. If the queue is full, emit `REJECT` with `altTarget` and let the sender retry.
4. If the queue has capacity, persist the CSE on a new CC ticket keyed by `session.callId`. The CC ticket retains the envelope contents for the entire queue wait + active handling + post-call window.
5. Emit `ACCEPT` (HTTP 202) and start playing the queue music to the caller (this part is in the CC's audio path).
6. When a human eventually picks up, the CTI screen-pops the envelope contents (now possibly enriched with CC-side data like wait time, customer history, etc.).

## What's special about Flow C

- **Async**. The IVR does NOT need to keep a synchronous media leg waiting for the human; the audio is already in the CC's hold path.
- **Persistence**. The envelope lives on the ticket, not in the wire's working memory. A caller who drops and calls back can be reconnected to the same ticket (depending on CC policy).
- **Retry semantics**. The `fallback` allows the IVR to immediately retry against an alt queue without bouncing the caller.

## What the human specialist sees

Same screen-pop as Flow A, but with queue metadata added:

```
┌────────────────────────────────────────────────────────────────┐
│  TICKET         tkt_2026_05_28_99231                           │
│  QUEUE          complaints-tier1 (waited 4m 12s)               │
│  CALLER         acc_***9921 (authenticated)                    │
│  INTENT         Complaint • closed-account-charges             │
│  WANT           Refund                                         │
│  IVR SUMMARY    "Caller wishes to complain about charges on    │
│                  a closed account."                            │
└────────────────────────────────────────────────────────────────┘
```
