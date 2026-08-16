# Skill: React Expert Engineering

Use this skill when building, debugging, or reviewing React components, hooks, context, state management, or performance. Covers React 18+, Vite, Next.js, and concurrent features.

## 1. Component Design & Hooks
- **Single responsibility**: Every component does one thing. If you can't name it clearly, it's doing too much — extract.
- **Explicit prop interfaces**: All component props in a named TypeScript interface. Never inline prop types on the function signature. Never use `React.FC<Props>` — prefer explicit function signatures with typed destructuring.
- **Composition over configuration**: Prefer component slots (children, render props) over prop switches like `showHeader={true}`. Configuration props that control layout belong in the layout layer, not the leaf component.
- **Custom hooks for reused state logic**: Extract `useAgentData`, `useLedgerFilter`, etc. when stateful logic appears in 2+ places or exceeds 20 lines in a component body.
- **useEffect discipline**: Always provide a dependency array. Return a cleanup function for subscriptions, timers, and event listeners. Never fetch data in `useEffect` — use React Query, SWR, or server components.

## 2. State, Performance & Accessibility
- **State placement**: UI state (open/closed, loading, error) — local `useState`. Server state — React Query or SWR. Shared app state — Context (small, infrequently changing) or Zustand (large or frequently changing). URL state — router search params. Never lift state higher than necessary.
- **`useMemo`/`useCallback`**: Only when a value is a dependency of another hook or a child component that would otherwise re-render unnecessarily. Profile before adding — premature memoization adds complexity without benefit.
- **Performance gates**: No `key={index}` on reorderable lists. Lists over 100 items use `@tanstack/react-virtual`. Initial bundle: lazy-load heavy routes with `React.lazy()` + `<Suspense>`. Run React DevTools Profiler before declaring rendering fixed.
- **Accessibility non-negotiables**: Every interactive element is keyboard-focusable, has a visible focus ring (never remove `outline`), and has an `aria-label` if the visual label is insufficient. Use semantic HTML elements before reaching for `role` attributes.
- **Verification**: Lighthouse a11y score ≥ 90. No layout shift on load (set explicit image dimensions). No prop drilling deeper than 2 levels — use context or co-location.
