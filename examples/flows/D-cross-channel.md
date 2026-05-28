# Flow D — Cross-channel resume

> Worked walkthrough for the canonical "caller switches channel mid-flow" pattern. Normative state machine and verb semantics in [`../../docs/08-handoff-flows.md`](../../docs/08-handoff-flows.md).

## Scenario

A caller starts on a voice call with the bank's AI agent (Vendor A). They are in the middle of disputing a charge. The call drops (signal loss). A few minutes later, they open the bank's web chat. The chat platform (Vendor C) detects the same authenticated user and looks up a recent OHP envelope keyed by `accountRef` + `intent.current`. It finds Vendor A's last envelope, fires an `ASSUME` over `ohp/https`, and the chat session opens pre-populated with the dispute context.

## Participants

| Role | Vendor | Component |
| --- | --- | --- |
| Original holder | Vendor A | Voice AI `asst_cs7` (call ended) |
| New holder (sender of ASSUME) | Vendor C | Chat platform |
| Receiver of ASSUME | Vendor A | OHP receiver endpoint |
| Caller | n/a | Same person, re-authenticated on web |

## Transport

`ohp/https`. The voice leg is gone; only async messaging is possible.

## Tier

**Sealed.** The conversation involves authenticated identity and payment context.

## Sequence

```
Caller (voice)         Vendor A (voice AI)           Vendor C (chat)
──────────────         ──────────────────            ──────────────────
       │                       │
   "I want to dispute  ────▶  │  state built up
   a charge..."               │  PROPOSE would have gone
                              │  to human, but...
       │                       │
       │   ───── signal loss ─────                              │
       X                       X                               │
                              │  envelope persisted             │
                              │  on Vendor A side               │
                                                                │
                                                                │
       │                                                        │
       │   (some time passes — caller opens web chat)           │
       │                                                        │
       │   ──────────────────── opens chat ──────────────────▶ │
       │   logs in (web SSO at AAL2)                            │
                                                                │
                                                                │ search recent
                                                                │ envelopes by
                                                                │ accountRef +
                                                                │ intent.current
                                                                │
                                                                │  found:
                                                                │  cse_01HZX0...K9
                                                                │
                              │   ◀──── POST /ohp/v1/transfer  │
                              │   ASSUME envelope               │
                              │   refs prior cse_01HZX0...K9    │
                              │                                 │
                              │  receiver-side verify:          │
                              │   1. resolve issuer (Vendor C)  │
                              │   2. verify JWS                 │
                              │   3. freshness                  │
                              │   4. consent overlap            │
                              │   5. AAL step-down OK?          │
                              │                                 │
                              │   ────── HTTP 200: ACCEPT  ──▶ │
                              │                                 │
                                                                │ chat opens
                                                                │ pre-populated
       │   ◀────────────────  chat shows:                       │
       │      "Hi Alex, I see you were               │          │
       │      disputing the £42.50 charge.           │          │
       │      Would you like to continue here?"      │          │
```

## The ASSUME envelope

Vendor C builds an envelope of type `ASSUME` that **references** the prior envelope `id`:

```json
{
  "ohp": "0.1",
  "conformance": "sealed",
  "id": "cse_01HZX1F2R5N9V8W1QYK0XQM3R3",
  "issuedAt": "2026-05-28T14:25:00Z",
  "notAfter":  "2026-05-28T14:30:00Z",

  "issuer": {
    "vendor": "vendor-c",
    "agentId": "chat_main",
    "region": "uk-west",
    "did": "did:web:chat.example.com",
    "federation": "did:web:federation.openhandoffprotocol.org"
  },

  "audience": {
    "vendor": "vendor-a",
    "did": "did:web:agents.example.com:asst_cs7",
    "purpose": "cross-channel-resume",
    "minTier": "sealed",
    "recipientKeys": [
      { "kid": "vendor_a_2026_05_x25519", "alg": "HPKE/X25519-SHA256-CHACHA20POLY1305" }
    ]
  },

  "session": {
    "callId": "chat_2026_05_28_K9_b2",
    "channel": "chat/web",
    "locale": "en-GB",
    "startedAt": "2026-05-28T14:24:00Z"
  },

  "caller": {
    "assurance": {
      "method": "web-sso",
      "ial": "IAL2", "aal": "AAL2", "fal": "FAL2",
      "lastStepUpAt": "2026-05-28T14:24:00Z",
      "idp": "did:web:idp.bank.example.com",
      "proofJws": "eyJ...PLACEHOLDER"
    },
    "identity": {
      "sdJwtVc": "eyJ...PLACEHOLDER",
      "claimsRevealed": ["given_name", "accountRef"]
    },
    "consent": [
      {
        "receiptId": "iso27560:rcpt_web_chat_2026_05",
        "purpose": "cross-channel-resume",
        "scope":   ["transcript.summary", "intent.current", "intent.slots:non-phi"],
        "lawfulBasis": "gdpr.art6.1.b",
        "jurisdiction": "GB",
        "transferMechanism": "uk-adequacy"
      }
    ]
  },

  "intent": {
    "current": { "name": "dispute_charge", "confidence": 0.97 },
    "stack": [
      { "name": "authenticate", "status": "satisfied" },
      { "name": "channel-bridged", "status": "satisfied" }
    ],
    "slots": {
      "accountRef": "acc_***7781",
      "resumeFromEnvelopeId": "cse_01HZX0R5N9V8W1QYK0XQM3R3KB"
    }
  },

  "transcript": {
    "format": "ohp.turns/v1",
    "redaction": { "policy": "pii-mask+pci-drop", "version": "1.1" },
    "summary": "Resuming dispute_charge conversation from prior voice envelope cse_01HZX0R5N9V8W1QYK0XQM3R3KB."
  },

  "policy": {
    "retention": { "transcript": "P30D", "audio": "P0D", "embeddings": "P7D" },
    "redaction": { "pii": "mask", "pci": "drop", "phi": "mask" },
    "guardrails": ["no-cross-sell", "no-payment-collection"],
    "dataResidency": ["GB"]
  },

  "control": {
    "verb": "ASSUME",
    "reason": "cross-channel-resume",
    "refs": { "proposedId": "cse_01HZX0R5N9V8W1QYK0XQM3R3KB" },
    "nonce": "5f60718293a4b5c6"
  },

  "signatures": [
    { "kid": "ck_vendor-c_2026_05_ed", "alg": "EdDSA", "jws": "eyJ...PLACEHOLDER" }
  ]
}
```

## Vendor-A-side receiver logic

When Vendor A receives this `ASSUME`:

1. Run the verification flow.
2. Confirm `caller.assurance` is sufficient (AAL2 may be acceptable for resume of a dispute already authenticated to AAL3 on the original leg — depending on policy).
3. Look up `cse_01HZX0R5N9V8W1QYK0XQM3R3KB` in Vendor A's local archive.
4. Confirm `accountRef` claims match between the new and old envelopes.
5. Confirm `intent.current.name` matches.
6. ACCEPT the resume; mark the original conversation as bridged to Vendor C's chat session.

## What if assurance is lower on the new channel?

This is a policy decision the receiver makes:

- **Strict policy**: receiver rejects with `assurance-insufficient`. Vendor C must step up the caller (e.g. send an OTP) before retrying.
- **Liberal policy**: receiver accepts AAL2 for resume but does NOT permit any further high-risk decisions until a step-up occurs.
- **Time-based**: receiver accepts a step-down if the original AAL3 happened within the last 15 minutes.

Vendor A exposes the policy via `/.well-known/ohp-capabilities.json#resumePolicy` so Vendor C knows what to attempt.

## What's special about Flow D

- **No live media leg.** The verb is `ASSUME`, not `PROPOSE` — Vendor C is claiming the conversation, not asking permission.
- **Lookup directory.** Both parties must agree on how to find the prior envelope. In v0.1, this is a deployment-specific concern (typically a shared customer tenancy). v0.2 introduces a standardised `/.well-known/ohp-resume-lookup` endpoint.
- **Identity step-down handling.** Cross-channel resumption commonly involves an assurance step-down. Receivers MUST decide explicitly whether this is acceptable; OHP carries the data to make the decision, not the decision itself.

## What the caller sees

The chat opens with a single AI greeting:

> "Hi Alex, I can see you were on a call about disputing the £42.50 charge but it ended unexpectedly. Want to pick up here, or shall I call you back?"

No re-authentication step. No "what was this about?" prompt. The caller's effort to resume is effectively zero.
