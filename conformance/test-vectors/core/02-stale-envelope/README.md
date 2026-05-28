# 02-stale-envelope

**Type:** accept-negative
**Tier:** Core
**Traces to:** `spec/ohp-0.1.md` §4.4 (envelope lifetime), `docs/09-trust-verification.md` step 3 (freshness)

## What this vector proves

A receiver presented with an envelope whose `notAfter` is in the past MUST reject the envelope with `REJECT reason="stale"`, regardless of any other validity properties.

## Files

- `envelope.json` — the input envelope (with a `notAfter` set to a fixed past time).
- `expected.json` — the expected receiver outcome.

## Fixture timing

The vector uses `issuedAt = 2026-05-28T12:00:00Z` and `notAfter = 2026-05-28T12:05:00Z`. Test runners MUST evaluate the freshness check using a fixed "now" of `2026-05-28T13:00:00Z` (well after `notAfter`), so the failure is deterministic.
