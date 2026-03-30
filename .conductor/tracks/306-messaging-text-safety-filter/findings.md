# Review Findings: #306

## [B] SSN regex produces false positives on common 9-digit numbers

Line 41 in safety-filter.ts — pattern matches zip+4, order numbers, model numbers. Remove SSN pattern entirely (threat model doesn't warrant it for C2C marketplace).

## [W] "pick up", "how about", "i can do" patterns too broad

Lines 59, 68, 70 — triggers on normal conversation. Tighten: remove "pick up" (legitimate marketplace flow), restrict "how about" and "i can do" to require dollar amounts.

## [W] Standalone `$\d+` pattern triggers on any price mention

Line 78 — matches any dollar amount including non-negotiation context. Remove standalone pattern; other negotiation patterns cover actual negotiation attempts.

## [W] Credit card regex matches 16-digit tracking/reference numbers

Line 40 — add Luhn check validation to distinguish real credit cards from tracking numbers.

## [I] Two-pass PII detection is unnecessary

Lines 96-118 — simplify to single pass with replace() + string comparison.

## [I] Missing repeated-call test for stateful regex regression

## [I] Missing test for empty string and whitespace-only input
