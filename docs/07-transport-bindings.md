# 07 · Transport bindings

> **Status:** Non-normative explanation. Binding identifiers, content types, and idempotency rules are normative; see [`../spec/ohp-0.1.md`](../spec/ohp-0.1.md) §7.

OHP rides one of four transport bindings. The same envelope crosses every binding; the choice is determined by the surrounding control plane (SIP for the telco edge, WebSocket for AI-to-AI runtime peering, HTTPS for asynchronous orchestration, gRPC for high-throughput intra-region control planes).

| Binding | When to use | Carrier | Idempotency surface |
| --- | --- | --- | --- |
| `ohp/sip-info` | Active SIP call, telco-only path | SIP `INFO`, `application/ohp+cbor`, multi-part if > 1300 bytes | `Call-ID` + `CSeq` |
| `ohp/ws` | Live AI-to-AI handoff, WebRTC or sidecar | WebSocket frames, `application/ohp+json` | Envelope `id` dedupe |
| `ohp/https` | Async handoff, queue join, post-call sync | `POST /ohp/v1/transfer`, JSON | `Idempotency-Key` header |
| `ohp/grpc` | Intra-region high-throughput control plane | Bidi streaming, protobuf mirror of JSON schema | Stream-scoped |

Every binding MUST run over a confidential channel (TLS 1.3 / DTLS 1.3 / SRTP). **Transport security never substitutes for L1 field-level sealing.** A receiver that reads sealed fields without first verifying the L1 trust steps is non-conformant regardless of how strong the transport TLS is.

A conformant implementation MUST support at least one binding; **full conformance** requires all four.

---

## `ohp/sip-info`

### Wire format

```
INFO sip:callee@example.com SIP/2.0
Via: SIP/2.0/TLS proxy.example.com;branch=z9hG4bK...
Call-ID: callid_2026K9
CSeq: 102 INFO
Content-Type: application/ohp+cbor
Content-Encoding: deflate
Content-Length: 4327
OHP-Version: 0.1
OHP-Tier: regulated
OHP-Verb: PROPOSE

<canonical-CBOR envelope bytes>
```

### Multi-part chunking

If the canonical CBOR exceeds the per-INFO body limit (commonly 1300 bytes in SBC defaults), the envelope is chunked using multipart with deterministic ordering:

```
Content-Type: multipart/ohp; boundary=ohp-chunk-7a91, total-chunks=3, chunk=1
```

Receivers reassemble by `id` + `chunk` index. Out-of-order delivery is tolerated for the duration of the envelope `notAfter` window.

### Idempotency

Combination of SIP `Call-ID` + `CSeq` + envelope `id` is the dedupe key. Retransmits are expected over UDP-fronted paths.

### Compatibility notes

- SBCs commonly strip X-headers. The OHP envelope rides the SIP INFO **body**, not headers, precisely to survive carrier transit.
- The body is CBOR (binary) not JSON, both for size and to avoid carrier log scraping of plaintext slot values. Sealed fields are still encrypted on top.
- `OHP-Tier` echoes `conformance` from the envelope so an SBC can route by tier without parsing CBOR.

---

## `ohp/ws`

### Wire format

WebSocket text frames carrying `application/ohp+json`. The first frame on a new connection MUST be a `hello` frame:

```json
{
  "type": "hello",
  "ohp": "0.1",
  "maxTier": "regulated",
  "bindings": ["ohp/ws"],
  "sessionToken": "DPoP-bound JWT"
}
```

Subsequent frames carry envelopes:

```json
{
  "type": "envelope",
  "envelope": { "...full CSE..." }
}
```

Acks:

```json
{ "type": "ack", "id": "cse_01HZX0R5N9V8W1QYK0XQM3R3K9", "status": "accepted" }
```

### Idempotency

Receivers dedupe by envelope `id` for a window equal to `notAfter - issuedAt` plus a 5-second clock-skew margin.

### Connection lifecycle

- A WS connection is **per-tenant-pair**, not per-call. Multiple concurrent envelopes from many active calls multiplex on one connection.
- Heartbeats: receiver SHOULD send `{ "type": "ping" }` every 20 seconds; sender SHOULD respond with `{ "type": "pong" }`.
- On disconnect, in-flight envelopes follow their `notAfter` deadlines independently; reconnection does not re-deliver.

### When to choose `ohp/ws`

- AI-to-AI handoff inside a shared SFU (Vendor A and Vendor B both peering with the same selective forwarding unit).
- Long-lived runtime-to-runtime control plane where the SIP side is irrelevant.

---

## `ohp/https`

### Wire format

```
POST /ohp/v1/transfer HTTP/1.1
Host: cc.example.com
Content-Type: application/ohp+json
Idempotency-Key: cse_01HZX0R5N9V8W1QYK0XQM3R3K9
DPoP: eyJ...
Authorization: Bearer eyJ...
OHP-Version: 0.1

{ "...full CSE..." }
```

### Response

```
HTTP/1.1 202 Accepted
Content-Type: application/ohp+json
OHP-Verb: ACCEPT

{
  "ohp": "0.1",
  "conformance": "regulated",
  "id": "cse_01HZX0R5N9V8W1QYK0XQM3R3M0",
  "session": { "callId": "callid_2026K9" },
  "control": { "verb": "ACCEPT", "nonce": "8b2c4f" },
  "signatures": [ ... ]
}
```

### Idempotency

The `Idempotency-Key` header MUST equal the envelope `id`. The receiver caches the response under that key for at least the envelope `notAfter`. Replays return the cached response, not a fresh processing run.

### When to choose `ohp/https`

- The handoff is **asynchronous** — sender does not need to keep a synchronous media leg open while waiting (e.g. queue join, post-call sync, voice ↔ chat resume).
- The receiver is an orchestration platform with a standard REST surface.
- The conversation is being re-hydrated minutes/hours after the previous leg ended.

---

## `ohp/grpc`

### Wire format

Bidirectional streaming RPC on a protobuf mirror of the JSON schema.

```proto
syntax = "proto3";
package ohp.v0_1;

service Handoff {
  rpc Stream(stream Envelope) returns (stream Envelope);
}

// Envelope mirrors the JSON schema 1:1 (field numbers stable across spec versions).
message Envelope {
  string ohp = 1;
  string conformance = 2;
  string id = 3;
  // ... see schemas/ohp-envelope.proto (placeholder in 0.1)
}
```

The protobuf descriptor is a placeholder in v0.1; full `.proto` lands in v0.2 alongside the gRPC conformance vectors. The intent is that any field in the JSON envelope has a stable protobuf field number across spec versions.

### Idempotency

Stream-scoped: within one bidi stream, envelope `id`s are unique. Re-sending the same `id` on the same stream is silently dropped. Across streams the receiver dedupes for `notAfter` duration.

### When to choose `ohp/grpc`

- High-volume intra-region peering between two large orchestrators where the WS framing overhead matters.
- Existing gRPC-based service mesh between the parties.

---

## Common requirements across all bindings

| Requirement | Detail |
| --- | --- |
| Transport security | TLS 1.3 (for `ohp/ws`, `ohp/https`, `ohp/grpc`), TLS 1.3 / DTLS 1.3 / SRTP (for `ohp/sip-info`). Older TLS versions MUST NOT be accepted. |
| Compression | DEFLATE permitted; receivers MUST tolerate uncompressed even if compression was advertised. |
| Envelope size cap | 32 KiB serialised JSON, 8 KiB canonical CBOR (signed bytes). Larger payloads MUST be moved out-of-band and referenced. |
| Rate limiting | Receivers MUST enforce per-issuer-`kid` rate limits and respond with structured `REJECT reason=rate-limit`. |
| Verb echo | The transport-level header `OHP-Verb` (HTTPS / SIP) or frame `type` (WS) MUST match `control.verb` inside the envelope. Mismatches MUST be rejected. |
| Tier echo | `OHP-Tier` header MUST match `conformance`. |

## Choosing a binding

```
Are you riding an active SIP call between two SBCs?       → ohp/sip-info
Two runtimes that peer over WebRTC or a sidecar control?  → ohp/ws
Asynchronous handoff, queue join, or cross-channel resume?→ ohp/https
Intra-region high-volume between large orchestrators?     → ohp/grpc
```

If unsure: implement `ohp/https` first. It is the simplest binding and exercises the same envelope.
