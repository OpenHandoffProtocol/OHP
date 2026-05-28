# Flow A — AI/IVR → live human agent

> Worked walkthrough for the canonical "warm transfer from an AI agent to a human in a contact centre" flow. Normative state machine and verb semantics are in [`../../docs/08-handoff-flows.md`](../../docs/08-handoff-flows.md).

## Scenario

A caller phones a bank. The bank's AI agent (Vendor A) authenticates the caller at AAL3 and handles the first 90 seconds of the conversation. The caller asks to speak to a human about a disputed charge. Vendor A initiates a warm transfer to Vendor B's contact-centre runtime; a human agent picks up.

## Participants

| Role | Vendor | Component |
| --- | --- | --- |
| Sender (issuer) | Vendor A | Voice AI agent `asst_cs7` |
| Receiver (audience) | Vendor B | Contact-centre runtime + CTI desktop |
| Caller | n/a | Authenticated at AAL3 via IdP (`did:web:idp.bank.example.com`) |

## Transport

`ohp/sip-info`. The OHP envelope rides the SIP INFO body, sent **before** the SIP REFER.

## Tier

**Sealed.** Payment-related slots are sealed to Vendor B's recipient key.

## Sequence

```
Vendor A (AI)           SBC / Carrier         Vendor B (CC)        Human agent
─────────────           ──────────────        ──────────────       ───────────
   │                          │                     │
   │  SIP INFO + CBOR env ───▶│                     │
   │  (PROPOSE, sealed)       │  forward            │
   │                          │ ──────────────────▶ │
   │                          │                     │ run verification flow:
   │                          │                     │  1. resolve issuer
   │                          │                     │  2. verify JWS
   │                          │                     │  3. check freshness
   │                          │                     │  4. bind to RTP
   │                          │                     │  5. resolve consent
   │                          │                     │  6. check AAL3
   │                          │                     │  7. HPKE-open
   │                          │                     │
   │                          │  SIP INFO + CBOR env│ ◀── all 7 pass
   │                          │ ◀───────────────── │  (ACCEPT, sealed)
   │  ◀────────────────────  │                     │  CTI screen-pop
   │                          │                     │      to human
   │                          │                     │
   │  SIP REFER  ───────────▶ │                     │  human picks up
   │                          │ ──────────────────▶ │ ──────────────▶ ☎
   │                          │                     │
   │  ASSUME (SIP INFO)  ───▶ │ ──────────────────▶ │  takes media leg
   │                          │                     │
   X drops agent leg          │                     │  (caller hears continuity)
```

## The envelope

See [`../envelopes/03-sealed-payment.json`](../envelopes/03-sealed-payment.json) for the full envelope content. Key points:

- `control.verb = "PROPOSE"`, `control.reason = "human-requested"`.
- `audience.minTier = "sealed"` — Vendor B must support Sealed or REJECT.
- `caller.assurance.aal = "AAL3"` — proof signed by the bank's IdP.
- `caller.identity.claimsRevealed = ["given_name", "accountRef"]` — only the two claims Vendor B needs.
- `intent.slots.card.ref` carries the network token, never PAN.
- `sealed.fields = ["payment.disputeDetail", "caller.vulnerable"]` — opaque to SBC; only Vendor B can decrypt.
- `session.media.rtpFingerprint` — Vendor B verifies this matches the live RTP leg.

## What the human agent sees on screen-pop

```
┌────────────────────────────────────────────────────────────────┐
│  CALLER         Alex (acc_***7781)                             │
│  ASSURANCE      AAL3 ✓ (voice-bio + OTP, last step-up 14:01)   │
│  INTENT         Dispute charge ch_7781                         │
│  AMOUNT         £42.50  (unauthorised)                         │
│  CONSENT        Receipt rcpt_99x_payments • GDPR 6(1)(b)       │
│  PREV TURNS     "I need to dispute a charge from yesterday."   │
│                 "Was it a card payment?"                        │
│                 "Yes, ending [REDACTED:pan-last4]."             │
└────────────────────────────────────────────────────────────────┘
```

The human **does not** ask the caller to re-authenticate. The CTI's first line is something like:

> "Hi Alex, I can see you're calling about a £42.50 charge — let me pull that up."

## What happens if Vendor B rejects

Possible rejection reasons and what Vendor A does:

| REJECT reason | What it means | Vendor A fallback |
| --- | --- | --- |
| `tier-insufficient` | Vendor B's max is `signed`, not `sealed`. | Workload required Sealed; cannot downgrade — play "please hold" tone, route to another receiver. |
| `not-bound-to-call` | RTP fingerprint mismatch (e.g. early media skew). | Recompute fingerprint, retry once. Then fall back to second receiver. |
| `signature-invalid` | JWS verify failed — receiver doesn't have Vendor A's current `kid`. | Force JWKS refresh on receiver side; retry. If persistent, fail open is NOT allowed; route to fallback receiver. |
| `consent-out-of-scope` | Vendor B's intended processing exceeds the receipt. | Vendor A cannot fix this at the wire; surface to ops + route to fallback receiver. |
| `assurance-insufficient` | Vendor B's policy demands a step-up. | Trigger Art 14 escalation back to caller for additional auth; reissue envelope with new assurance. |

## End-to-end latency budget

| Step | Budget |
| --- | --- |
| Envelope construction (Vendor A) | < 20 ms |
| SIP INFO + CBOR transmission | < 30 ms (single hop) |
| Receiver verification (Vendor B) | < 60 ms |
| CTI screen-pop render | < 30 ms |
| Human agent ready signal | depends on queue |
| ASSUME + media leg drop | < 20 ms |
| **Total OHP processing overhead** | **~80 ms** |

The caller does not perceive the seam; the human picks up speaking as if they had been on the call all along.

## What was avoided

Without OHP, Vendor B would typically need the human agent to ask:

- "Can I take your account number, please?"
- "And the second character of your password?"
- "What's this regarding?"
- "And how much was the charge?"

Each adds 5–15 seconds of caller frustration and reduces customer-effort scores. With OHP, none of those questions get asked.
