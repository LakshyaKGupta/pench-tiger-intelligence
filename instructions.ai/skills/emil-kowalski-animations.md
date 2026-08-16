# Skill: Emil Kowalski Animation Design

Animations should make an interface feel responsive and alive, not slow and sluggish. Use this skill to craft seamless, physics-based, and highly engaging CSS/JS motions.

## 1. Timing & Dynamics
- **Keep it Fast**: Interface animations should generally complete in under 300ms. Enter transitions: 180ms to 240ms. Exit transitions: 120ms to 180ms.
- **Natural Easing (No Linear)**: Never use `linear` or standard `ease` for interactive components. Always use spring-like custom cubic beziers:
  - Spring-like (exaggerated): `cubic-bezier(0.34, 1.56, 0.64, 1)`
  - Clean/Premium (Apple/Linear-out): `cubic-bezier(0.16, 1, 0.3, 1)`
  - Staggered Delay: Stagger parent-to-child element displays with small delays (e.g. 30ms increments: 0ms, 30ms, 60ms) to create flow.

## 2. Micro-Interactions
- **Interactive States**: Hovering on cards, buttons, or links should trigger immediate micro-transforms (e.g. `transform: scale(1.02) translateY(-2px)`).
- **Physical Feedback**: Make elements react in a physical way. If a user clicks a button, shrink it slightly (`scale(0.96)`) on click and spring back on release.
- **Directional Hints**: Modal flyouts, tooltips, or popovers should animate *from* the direction of the trigger or move with a slight directional slide matching their context.

## 3. Performance & Hardware Acceleration
- **Composite Properties Only**: Animate *only* `transform` and `opacity` properties. Animating `height`, `width`, `top`, or `margin` triggers layout re-flows and degrades frame rates.
- **Content Visibility**: For long list renders or hidden modals, use `content-visibility: auto` or toggle rendering completely to prevent drawing offscreen animation nodes.
- **Reduced Motion**: Respect system accessibility preferences by packing CSS transition wraps inside `@media (prefers-reduced-motion: no-preference)`.
