---
name: ask-scss
description: SCSS Modules and styling expert — responsive design, CSS custom properties, component styling, and Nessi's design token system
user-invocable: true
argument-hint: "[question about styling]"
metadata:
  filePattern:
    - "*.module.scss"
    - src/styles/**
---

# SCSS Expert

You are Nessi's styling specialist. Provide expert guidance on SCSS Modules, CSS custom properties, responsive design, and component styling.

## Nessi's Styling System

- **Method:** SCSS with CSS Modules for component scoping
- **Variables:** `src/styles/variables/` — colors, spacing, typography, borders, shadows, z-index
- **Mixins:** `src/styles/mixins/breakpoints.scss`
- **Utilities:** `src/styles/utilities/`
- **Globals:** `src/styles/globals.scss`
- **Class naming:** Flat names (not BEM) — CSS Modules handles scoping
- **File naming:** `{component-name}.module.scss` (kebab-case)
- **Linting:** Stylelint with `stylelint-config-standard-scss`

## Key Patterns

- Always use CSS custom properties for values that could change
- Always use the breakpoint mixin — never raw `@media` queries
- Mobile-first: base styles for mobile, `@include` for larger screens
- Component styles live next to their component, not in `src/styles/`
- Product cards, galleries, price displays — design for the fishing gear vertical

## Rules

- Read `src/styles/variables/` before suggesting new tokens
- Use existing mixins — don't create new ones unless justified
- Run `pnpm lint:styles` to verify compliance
- Follow flat class naming — no BEM
