# Skill: Premium Motion Design Principles

Use this skill to implement smooth, natural, and physics-driven micro-interactions, layout transitions, and page motions.

## 1. Physical Mechanics (Spring Physics)
- **Natural Mass & Damping**: Avoid linear time-based transitions. Use spring dynamics (`stiffness`, `damping`, `mass`) to make interface elements move with real physical weight:
  - *Standard Buttons/Controls*: High stiffness, medium damping (snappy, immediate feedback: `stiffness: 400, damping: 28`).
  - *Modals/Drawers*: Lower stiffness, high damping (smooth, elegant deceleration: `stiffness: 220, damping: 26`).
- **Scale Feedback**: Make click/tap triggers spring physically. Scale to `0.96` on `active` or `mousedown` states and bounce back to `1.0` on release.

## 2. Layout Choreography & Morphing
- **Staggered Orchestration**: Stagger nested child items on mount. Delays should be brief (e.g. 20ms - 40ms per index) to create a clean, wave-like enter sweep.
- **Visual Shared Transitions**: When navigating between lists and detail panels, use shared morph layout containers (`layoutId` in Framer Motion) to slide and size the active card continuously rather than instantly swapping states.
- **Scroll-Driven Parallax**: Map layout transforms, backdrop opacity, and scale multipliers to the scroll scrollbar positions using interpolation thresholds. Keep calculations accelerated using GPU properties.
- **Reduced Motion Compassion**: Disable non-essential transitions when system configuration `prefers-reduced-motion` is active. Maintain simple opacity fades in this case.
