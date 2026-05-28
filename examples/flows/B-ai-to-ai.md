# Flow B — AI vendor A → AI vendor B

> Worked walkthrough for the canonical "AI runtime to AI runtime" handoff. Normative state machine and verb semantics in [`../../docs/08-handoff-flows.md`](../../docs/08-handoff-flows.md).

## Scenario

A telco's customer is in conversation with a generalist voice agent (Vendor A). The intent transitions from "general support" to "fraud / dispute" — a domain where Vendor A's generalist model is less accurate than Vendor B's specialist model. Vendor A initiates an AI-to-AI handoff to Vendor B. Audio continues uninterrupted in a shared SFU room; the receiving agent rehydrates the conversation state and continues without the caller noticing the seam.

## Participants

| Role | Vendor | Component |
| --- | --- | --- |
| Sender (issuer) | Vendor A | Generalist voice agent `asst_gen2` |
| Receiver (audience) | Vendor B | Fraud specialist agent `asst_fraud9` |
| Media | shared | SFU room `sfu_pop_lhr.k9` |
| Caller | n/a | Authenticated at AAL2 via IdP |

## Transport

`ohp/ws`. Vendor A and Vendor B maintain a long-lived WebSocket between their control planes; envelopes ride this connection. Media stays in the shared SFU room.

## Tier

**Sealed.** The conversation involves authenticated identity and a fraud-flag claim that should not be visible to intermediaries.

## Sequence

```
Vendor A (AI gen)                                 Vendor B (AI specialist)
─────────────────                                 ────────────────────────
       │                                                    │
       │  WS hello (already connected)                      │
       │                                                    │
       │  WS frame: { type:"envelope", PROPOSE } ────────▶ │
       │                                                    │ verify (steps 1-7)
       │                                                    │ rehydrate state
       │                                                    │
       │   ◀────────── WS frame: { type:"ack", ACCEPT }    │
       │                                                    │
       │  WS frame: { type:"envelope", ASSUME }  ────────▶ │ takes the floor
       │                                                    │ starts producing
       │                                                    │ audio in SFU
       │  (drops out of SFU producer slot)                  │
       │                                                    │
       │                                                    │
       │                  (specialist handles dispute)       │
       │                                                    │
       │                                                    │
       │   ◀──── WS frame: { type:"envelope", RETURN }    │ done; handing back
       │                                                    │
       │ takes the floor back                               │
       │ (closes out call)                                  │
```

## The envelope

A simplified PROPOSE envelope for Flow B (Sealed tier):

```json
{
  "ohp": "0.1",
  "conformance": "sealed",
  "id": "cse_01HZX0F2R5BC4D6E8GHJKMN1PQR",
  "issuedAt": "2026-05-28T16:22:10Z",
  "notAfter":  "2026-05-28T16:27:10Z",

  "issuer": {
    "vendor": "vendor-a",
    "agentId": "asst_gen2",
    "region": "uk-west",
    "did": "did:web:agents.example.com:asst_gen2",
    "federation": "did:web:federation.openhandoffprotocol.org"
  },

  "audience": {
    "vendor": "vendor-b",
    "did": "did:web:agents.example.com:asst_fraud9",
    "purpose": "ai-vendor-handoff",
    "minTier": "sealed",
    "recipientKeys": [
      { "kid": "vb_2026_05_x25519", "alg": "HPKE/X25519-SHA256-CHACHA20POLY1305" }
    ]
  },

  "session": {
    "callId": "callid_2026_GEN_K9",
    "channel": "voice/webrtc",
    "locale": "en-GB",
    "media": {
      "rtpFingerprint": "sha256:b1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f6071829a3b4c5d6e7f80910",
      "sdpHints": { "codecs": ["OPUS/48000/2"] }
    }
  },

  "caller": {
    "assurance": {
      "method": "phone+otp",
      "ial": "IAL2", "aal": "AAL2", "fal": "FAL2",
      "lastStepUpAt": "2026-05-28T16:20:00Z",
      "idp": "did:web:idp.telco.example.com",
      "proofJws": "eyJ...PLACEHOLDER"
    },
    "identity": {
      "sdJwtVc": "eyJ...PLACEHOLDER",
      "claimsRevealed": ["given_name", "accountRef", "tenure_months"]
    },
    "consent": [
      {
        "receiptId": "iso27560:rcpt_telco_2026_05",
        "purpose": "ai-vendor-handoff",
        "scope":   ["transcript.summary", "intent.slots:non-phi", "fraud.flag:sealed"],
        "lawfulBasis": "gdpr.art6.1.b",
        "jurisdiction": "GB",
        "transferMechanism": "uk-adequacy"
      }
    ]
  },

  "intent": {
    "current": { "name": "fraud_dispute", "confidence": 0.78 },
    "stack": [
      { "name": "authenticate", "status": "satisfied" },
      { "name": "support_route", "status": "satisfied" }
    ],
    "slots": {
      "accountRef": "acc_***5523",
      "suspectedTxnRef": "txn_aa12"
    }
  },

  "sealed": {
    "alg": "HPKE/X25519-SHA256-CHACHA20POLY1305",
    "recipients": [ { "kid": "vb_2026_05_x25519", "enc": "PLACEHOLDER_ENC" } ],
    "ciphertext": "PLACEHOLDER_CIPHERTEXT_CONTAINING_FRAUD_RISK_SCORE",
    "fields": ["fraud.riskScore", "fraud.suspectedPattern"]
  },

  "transcript": {
    "format": "ohp.turns/v1",
    "redaction": { "policy": "pii-mask+pci-drop", "version": "1.1" },
    "summary": "Caller authenticated at AAL2; reported unrecognised transaction txn_aa12 on acc_***5523. Routing to fraud specialist."
  },

  "memory": {
    "modelAllowlist": ["openai:gpt-4o","anthropic:claude-3.7"],
    "facts": ["customer prefers concise responses"]
  },

  "policy": {
    "retention": { "transcript": "P30D", "audio": "P0D", "embeddings": "P7D" },
    "redaction": { "pii": "mask", "pci": "drop", "phi": "drop" },
    "guardrails": ["no-cross-sell", "no-payment-collection"],
    "dataResidency": ["GB"]
  },

  "control": {
    "verb": "PROPOSE",
    "reason": "skill-routing",
    "fallback": { "verb": "RETURN", "after": "PT60S",
                  "acceptableReasons": ["assurance-insufficient"] },
    "nonce": "3d4e5f6071829304"
  },

  "signatures": [
    { "kid": "ck_vendor_a_2026_05_ed", "alg": "EdDSA", "jws": "eyJ...PLACEHOLDER" }
  ]
}
```

## Receiver-side rehydration

When Vendor B's `asst_fraud9` takes the floor, it does **not** start with "Hi, I'm a different assistant — can you tell me what this is about?" It starts with something like:

> "I can see you've reported transaction `txn_aa12`. Let me dig into that — can you confirm roughly when you noticed it?"

The receiving agent has loaded:

- The caller's name (`given_name` disclosed in SD-JWT)
- The account reference
- The intent (`fraud_dispute`)
- The suspect transaction reference
- The fraud risk score (HPKE-opened from `sealed`)
- The redacted transcript summary
- The model-allowlisted memory facts (`prefers concise responses` — used to shape response length)

## What about voice / persona switching?

Vendor B may use a different TTS voice. The caller will hear a brief voice change. The Art 50 disclosure was already made and is carried in `governance.art50Disclosure` (at Regulated; at Sealed it lives outside the envelope). Vendor B does NOT need to re-do disclosure; it MAY say "I'm a specialist assistant" if it wishes, but not required.

## What about `RETURN`?

After the specialist completes its work, Vendor B issues `RETURN` with the same `id` chain reference. Vendor A's `asst_gen2` resumes the conversation with updated slots (e.g. `fraud_case_opened = true`) and gracefully closes out the call.

## End-to-end latency budget

| Step | Budget |
| --- | --- |
| Envelope construction (Vendor A) | < 20 ms |
| WS PROPOSE round trip | < 30 ms |
| Receiver verification (Vendor B) | < 60 ms |
| Vendor B rehydration + first-turn-ready | < 200 ms |
| ASSUME + audio producer swap in SFU | < 50 ms |
| **Total perceived gap to caller** | **~350 ms** |

Within human conversational tolerance — appears as a thoughtful pause, not a transition.
