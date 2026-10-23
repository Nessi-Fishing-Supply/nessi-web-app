# Review Findings — #145

## [B] Blocking

### B1. ReservationCheck type missing optional fields

The plan specifies `reservedBy?` and `reservedUntil?` on `ReservationCheck` for internal use. The public API already strips these.

### B2. Race condition in reserveListingsServer

No error handling on listing status update after reservation insert. If the update fails, creates inconsistent state.

## [W] Warning

### W1. CLAUDE.md function names don't match implementation

Service table, hooks table, and API routes table reference names that differ from actual code.

### W2. Sequential N+1 listing lookups in reserveListingsServer

Each listing triggers separate select+insert+update. Consistent with cart patterns but noted.

### W3. releaseReservationServer silently succeeds if listing already sold

WHERE status = 'reserved' guard means nothing happens if listing is sold. Acceptable but noted.

### W4. Extension check has clock skew sensitivity

JS Date.now() vs Postgres now() can differ. Should add tolerance or use Postgres for reserved_until.

## [I] Info

### I1. Hooks filename mismatch in CLAUDE.md (singular vs plural)

### I2. Unused `req` parameter in check route

### I3. Description comments well-written on all handlers

### I4. Client services and hooks follow cart patterns closely
