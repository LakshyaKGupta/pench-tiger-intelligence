# Skill: Aceternity UI Components

Use this skill when building React/Next.js UIs that require premium, animated, visually stunning components. Aceternity UI provides 100+ hand-crafted components with built-in animations, glass effects, and modern aesthetics.

## What is Aceternity UI?
Aceternity UI (ui.aceternity.com) is a collection of copy-paste React+Tailwind components with beautiful animations, glassmorphism, particle effects, and modern design patterns. It now integrates with the shadcn registry.

## MCP Tools Available (via `aceternity-ui` MCP)
- Search for components by name or category
- Fetch installation instructions (dependencies, code)
- List all available components with descriptions
- Get component variants and props

## When to Use
- Need animated hero sections, cards, or backgrounds
- Building landing pages that need to "wow" on first impression
- Want glassmorphism, spotlight effects, grid patterns, or aurora effects
- Need testimonials, pricing cards, or feature grids with premium feel

## Key Components

### Backgrounds & Effects
- **Aurora Background** — gradient aurora effect for hero sections
- **Background Beams** — animated beam effects
- **Sparkles** — particle sparkle overlay
- **Dot Background** — subtle dot grid pattern
- **Grid Background** — CSS grid with gradient fade

### Cards & Containers
- **3D Card Effect** — perspective tilt on hover
- **Glare Card** — glass card with moving glare highlight
- **Feature Sections** — multi-column feature grids
- **Bento Grid** — Apple-style bento grid layouts

### Navigation & UI
- **Floating Navbar** — glassmorphism floating navigation
- **Sidebar** — animated collapsible sidebar
- **Spotlight** — cursor-following spotlight effect

### Text & Typography
- **Text Generate Effect** — character-by-character text reveal
- **Typewriter Effect** — streaming typewriter animation
- **Flip Words** — word rotation animation
- **Highlight** — animated text highlight effect

## Installation Pattern
```bash
# Via shadcn registry (recommended)
npx shadcn@latest add "https://ui.aceternity.com/registry/aurora-background.json"

# Or ask the MCP for specific component install commands
```

## Usage Rules
1. **Always** add `framer-motion` when using animation components: `npm install framer-motion`
2. **Always** add `tailwindcss-animate` for CSS-based animations
3. Adjust color tokens to match your project's design system — never use Aceternity defaults blindly
4. Combine with real content (not Lorem Ipsum) when demoing to users
5. Use `cn()` utility from `clsx` + `tailwind-merge` for className merging

## Integration with 21st.dev
- Use 21st.dev's `/ui` command to generate component code
- Use Aceternity MCP to search existing ready-made components
- Prefer Aceternity for effects/animations; prefer 21st.dev for layout components

## Code Pattern
```tsx
import { AuroraBackground } from "@/components/ui/aurora-background";
import { SparklesCore } from "@/components/ui/sparkles";

export function Hero() {
  return (
    <AuroraBackground>
      <div className="relative flex flex-col items-center justify-center h-screen">
        <SparklesCore particleColor="#ffffff" />
        <h1 className="text-5xl font-bold text-white">Your Headline</h1>
      </div>
    </AuroraBackground>
  );
}
```
