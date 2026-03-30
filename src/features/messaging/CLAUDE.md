# Messaging Feature

## Overview

Real-time messaging between buyers and sellers, including offer negotiations.

## Components

- `message-thread/` — Chat thread with sent/received bubbles
- `offer-bubble/` — Inline offer display within message thread

## Utils

- `safety-filter.ts` — Text safety filter for message content. Pure function that detects PII (redacts with `[removed]`), explicit language (blocks), off-platform dealing attempts (nudges), and price negotiation patterns (nudges). Processing order: block → redact → nudge → pass. Regex patterns compiled at module level. Credit card detection uses Luhn validation to avoid false positives.

## Future

- `services/messaging.ts` — Message CRUD
- `services/offers.ts` — Offer lifecycle
- `hooks/use-messages.ts` — Tanstack Query hooks
