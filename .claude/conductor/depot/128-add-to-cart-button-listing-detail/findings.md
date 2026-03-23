# Review Findings — #128

## Warnings (fixing)
- [W] W-2/I-2: Sticky bar renders AddToCartButton with default `fullWidth={true}` — should pass `fullWidth={false}`
- [W] W-5: Hardcoded `min-height: 44px` (3 occurrences) — use design token or document exception
- [W] W-6: Hardcoded `border: 2px solid` — use design token
- [W] I-4: Import uses direct path instead of barrel export

## Info (no action)
- [I] I-1: "View Cart" toast action not implemented — ToastData interface lacks action prop
- [I] I-3: Stale isAuthenticatedInCart during rapid add — mitigated by isPending/disabled
- [I] W-1: useCart() observer created for guests — harmless, enabled: false prevents fetch
- [I] W-2: priceCents asymmetry (guest-only) — already documented in CLAUDE.md
