## Preflight Findings

### [W] OfferInsert does not use Omit pattern like sibling types

- **Check:** Code Review
- **File:** `src/features/messaging/types/offer.ts`
- **Error:** `OfferInsert` is the raw Insert type without `Omit` for auto-generated columns, deviating from sibling patterns
- **Fix:** Add `Omit<..., 'id' | 'created_at' | 'updated_at'>` to match `MessageThreadInsert` and `MessageInsert` patterns

### [W] createOfferServer does not validate params.sellerId against listing.seller_id

- **Check:** Code Review
- **File:** `src/features/messaging/services/offers-server.ts`
- **Error:** If caller passes a sellerId that doesn't match the listing's actual seller, the offer would be addressed to the wrong person
- **Fix:** Add validation: `if (params.sellerId !== listing.seller_id) throw new Error('Seller does not match listing')`

### [I] createThreadServer has no offer-type duplicate check

- **Check:** Code Review
- **Error:** Each call creates a new thread for offer type. May be intentional (each offer gets its own thread).

### [I] getOfferByIdServer throws on non-existent offer (consistent with sibling pattern)

### [I] counterOfferServer buyer/seller swap is intentional per plan
