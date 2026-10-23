# Styles

## Mobile-First Approach

Nessi is a consumer marketplace where the majority of traffic comes from mobile devices. **Every component must be styled mobile-first** — write base styles for the smallest viewport, then layer on enhancements at wider breakpoints.

### Rules

1. **Base styles = mobile styles.** The un-media-queried CSS is what phones see. No exceptions.
2. **Scale up with `@include breakpoint()`.** Use the project's `min-width` mixin to add tablet/desktop overrides:

   ```scss
   .card {
     padding: var(--space-sm);
     flex-direction: column;

     @include breakpoint(md) {
       padding: var(--space-lg);
       flex-direction: row;
     }
   }
   ```

3. **Never use `max-width` media queries.** They indicate desktop-first thinking. If you find yourself writing one, refactor: make the mobile layout the default, then override upward.
4. **Never use `@media (max-width: ...)` directly.** Always use `@include breakpoint()` for consistency. The available breakpoints are:
   - `sm` — 480px (large phones / small tablets)
   - `md` — 768px (tablets)
   - `lg` — 1024px (small desktops)
   - `xl` — 1200px (wide desktops)
5. **Test the narrowest case first.** When writing or reviewing styles, mentally (or actually) start at 320px and work upward.

### Common Patterns

**Stacked-to-horizontal layouts:**

```scss
.container {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);

  @include breakpoint(md) {
    flex-direction: row;
    gap: var(--space-md);
  }
}
```

**Single-to-multi-column grids:**

```scss
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-sm);

  @include breakpoint(md) {
    grid-template-columns: repeat(2, 1fr);
  }

  @include breakpoint(lg) {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**Touch-friendly tap targets:**

- Buttons and interactive elements must be at least 44x44px on mobile (WCAG 2.5.8).
- Use generous padding rather than relying on the text content to meet the minimum.

**Typography scales automatically.** The design token system in `variables/typography.scss` already uses a tighter ratio (1.2) on mobile and a wider ratio (1.309) at the `md` breakpoint. Use the `--font-size-*` custom properties — don't set raw `font-size` values.

**Spacing scales with breakpoints.** Use `--space-*` tokens for all padding, margins, and gaps. If a layout needs more breathing room on desktop, override the token usage at a breakpoint — don't replace tokens with pixel values.

### What to Avoid

- **Fixed widths** (`width: 800px`) — use `max-width` with percentage or viewport-relative fallbacks.
- **Hover-only interactions** — touch devices have no hover. Always ensure interactive states are accessible via tap/focus. Use `:hover` and `:focus-visible` together.
- **Overflow hidden without thought** — small screens clip content easily. Check that truncated text has a way to be seen (title attribute, expand action, etc.).
- **Desktop-first refactoring** — if existing code uses `max-width` queries, refactor it to mobile-first when you touch that file.

## Design Token System

All visual values come from CSS custom properties defined in `src/styles/variables/`:

| File              | Tokens                             | Notes                                                      |
| ----------------- | ---------------------------------- | ---------------------------------------------------------- |
| `colors.scss`     | `--color-*`                        | Brand, neutrals, grayscale, system (error/warning/success) |
| `spacing.scss`    | `--space-*`                        | 8px grid system, 11 levels from `3xs` to `5xl`             |
| `typography.scss` | `--font-size-*`, `--font-family-*` | Modular scale, responsive via breakpoint                   |
| `radius.scss`     | `--radius-*`                       | 5 levels from `sm` (4px) to `2xl` (40px)                   |
| `shadows.scss`    | `--shadow-*`                       | 7 elevation levels plus modal shadow                       |
| `animations.scss` | `--transition-*`                   | Shared transition timing                                   |

**Do not hardcode colors, spacing, font sizes, or shadows.** Always use the corresponding token. If a new value is needed, add it to the appropriate variables file first.

## File Organization

- `globals.scss` — Imports all variables, mixins, and utilities. Imported once in the root layout.
- `mixins/breakpoints.scss` — The `breakpoint()` mixin. This is the only way to write media queries.
- `variables/` — Design tokens as CSS custom properties on `:root`.
- `utilities/` — Global styles for forms, tables, typography, and third-party overrides (Swiper).

Component styles live alongside their components as `*.module.scss` files, not in this directory.
