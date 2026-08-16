# Skill: Refero Style & Design System Intelligence

Use this skill when building UIs that need real-world, professional design patterns — not generic Bootstrap-style output.

## What is Refero?
Refero (refero.design) is a curated library of 60+ real-world design systems from companies like Linear, Vercel, Stripe, Notion, and more. When integrated via MCP, it lets AI assistants pull actual `design.md` style sheets describing typography, color palettes, spacing, interaction patterns, and component guidelines.

## MCP Tools Available (via `refero-styles` MCP)
- `refero_list_styles` — list all 60+ curated design systems
- `refero_search_styles` — search by keyword (e.g., "dark SaaS", "fintech", "minimal")
- `refero_get_design_md` — fetch full `design.md` for a specific style (e.g., "linear", "vercel")
- `refero_match_style` — describe your project and get the best matching design system

## When to Use
- Starting a new UI project and want a reference design system
- Need consistent tokens (colors, radii, spacing, fonts) for a specific brand feel
- Generating components that feel "production-grade" rather than generic
- Asked to match a specific company's design aesthetic

## How to Use in Practice
1. **Match Style**: Ask the MCP to find a style matching your project description
   ```
   refero_match_style("dark developer tools SaaS, minimal, monospace-heavy")
   ```
2. **Fetch Design MD**: Get the full design system document
   ```
   refero_get_design_md("linear")
   ```
3. **Apply to Code**: Use the tokens from the returned `design.md` to drive all CSS custom properties, component variants, and spacing scales

## Example Style Categories
- **Linear** — minimal, dark, monospace, crisp
- **Vercel** — dark mode, high contrast, developer-first
- **Stripe** — clean, professional, blue-accent, light
- **Notion** — neutral, soft, document-centric
- **Figma** — colorful, playful, design-tool aesthetic

## Integration Pattern
```css
/* Apply fetched design tokens as CSS vars */
:root {
  --color-bg: #0a0a0a;          /* from design.md */
  --color-fg: #ededed;
  --color-accent: #7c3aed;
  --font-mono: "GeistMono", monospace;
  --radius-sm: 4px;
  --radius-md: 8px;
}
```

## Quality Gates
- Never use generic Bootstrap/Material colors when a real design system token exists
- Always match border-radii, font-sizes, and spacing to the fetched design.md
- Combine Refero style data with Aceternity UI or 21st.dev components for maximum quality
