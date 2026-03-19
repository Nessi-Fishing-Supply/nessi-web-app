---
name: diagram
description: Generate Mermaid diagrams for user journeys, product flows, data flows, and architecture — viewable in VS Code
user-invocable: true
argument-hint: "[type] [subject] (e.g., 'user-journey checkout' or 'data-flow orders')"
---

# Diagram Generator

Generate Mermaid diagrams for Nessi's product flows, user journeys, data flows, and architecture. Diagrams are saved as markdown files viewable in VS Code with Mermaid preview.

## Input

Type and subject: `{{ args }}`

## Diagram Types

### User Journey
Maps the step-by-step experience of a buyer or seller through a feature.
```
/diagram user-journey "buying a fishing rod"
/diagram user-journey "listing a product for sale"
/diagram user-journey "searching for lures"
```

### Product Flow
Maps the system-level flow of a feature — what happens at each layer (UI → API → DB → response).
```
/diagram product-flow "image upload"
/diagram product-flow "product creation"
/diagram product-flow "authentication"
```

### Data Flow
Maps how data moves between components, services, and the database.
```
/diagram data-flow "product listing to purchase"
/diagram data-flow "search and filter pipeline"
```

### Architecture
Maps the structural relationships between system components.
```
/diagram architecture "messaging system"
/diagram architecture "notification pipeline"
```

## Process

### Step 1: Understand the Subject

1. If the subject references an existing feature, scan the codebase to understand the current implementation
2. If the subject references a planned feature, check `docs/design-specs/` for a design spec
3. Ask 1-2 clarifying questions if the scope is ambiguous

### Step 2: Generate the Diagram

Create a Mermaid diagram appropriate for the type:

| Type | Mermaid Chart | Best For |
|------|--------------|----------|
| user-journey | `journey` or `flowchart LR` | Step-by-step user experience |
| product-flow | `sequenceDiagram` | System interactions across layers |
| data-flow | `flowchart LR` | Data movement between components |
| architecture | `graph TB` | Structural relationships |

Include:
- Clear labels on every node and edge
- Subgraphs for logical groupings (Frontend, Backend, Database)
- Color coding via `classDef` for different component types
- Notes for important details

### Step 3: Save

Save to `docs/diagrams/{type}-{kebab-subject}.md` with a title and the Mermaid block.

```
📊 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Diagram — {type}: {subject}
   Saved: docs/diagrams/{filename}.md
   View: Open in VS Code → Mermaid preview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Rules

- Always scan the codebase before diagramming existing features — diagrams must match reality
- Use Mermaid syntax that VS Code's Markdown Preview Mermaid extension can render
- Keep diagrams focused — one concept per diagram, not everything at once
- Use consistent color coding: blue=frontend, green=state, orange=backend, purple=infra
- Include enough detail to be useful, but not so much that the diagram is unreadable
- For user journeys, include happy path AND key error/edge cases
- Reference actual file paths in labels when diagramming existing code
- Diagrams live in `docs/diagrams/` — keep this directory organized by type
