# 01-minimal-valid

**Type:** accept-positive
**Tier:** Core
**Traces to:** `spec/ohp-0.1.md` §3.1.1 (Core mandatory fields), §4.2 (mandatory field table)

## What this vector proves

A receiver presented with an envelope containing the minimum mandatory Core-tier fields, with valid `issuedAt`/`notAfter` and a recognised control verb, MUST accept it and return `ACCEPT`.

## Files

- `envelope.json` — the input envelope.
- `expected.json` — the expected receiver outcome.

## Fixture timing

The vector uses a fixed `issuedAt = 2026-05-28T13:42:11Z` and `notAfter = 2026-05-28T13:47:11Z`. Test runners MUST evaluate the freshness check using a fixed "now" of `2026-05-28T13:43:00Z` (between the two), provided via the runner's `--now` flag, so the vector remains reproducible regardless of when it is executed.
