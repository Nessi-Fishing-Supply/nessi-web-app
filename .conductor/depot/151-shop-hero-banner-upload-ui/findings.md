# Review Findings: #151 — Shop hero banner upload UI

## Preflight Results

- TypeScript: pass
- ESLint: pass (0 errors)
- Stylelint: pass
- Prettier: pass (1 fix applied to shops CLAUDE.md)
- Tests: pass (435 tests)
- Build: pass

## Code Review Findings

### [W] Missing error feedback in HeroBannerUpload handleCrop

- **File:** src/features/shops/components/hero-banner-upload/index.tsx
- **Issue:** handleCrop has try/finally but no catch — upload failures show no user feedback
- **Fix:** Add catch block with toast error message

### [W] CLAUDE.md documents wrong response key

- **File:** src/features/shops/CLAUDE.md
- **Issue:** Documents `{ heroBannerUrl: string }` but actual API returns `{ url: string }`
- **Fix:** Update documentation to match implementation

### [I] Hardcoded letter-spacing instead of token

- **File:** src/features/shops/components/hero-banner-upload/hero-banner-upload.module.scss
- **Note:** Pre-existing pattern across codebase, not a regression

### [I] Redundant hero_banner_url DB update

- **Note:** API route and client both update the column — idempotent, working as designed

### [I] border-radius token choice

- **Note:** Uses var(--radius-300), which is a valid design token — reasonable choice
