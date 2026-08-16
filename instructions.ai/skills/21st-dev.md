# Skill: 21st.dev

Use this skill when integrating or designing components inspired by the state-of-the-art interactive libraries (e.g. 21st.dev, shadcn/ui, Magic UI, Aceternity UI).

## 1. Tailwind Component Structure
- **Class Merging (`cn`)**: Always use a class name merger utility (like `clsx` + `tailwind-merge`) to allow downstream override capabilities:
  ```typescript
  import { clsx, type ClassValue } from "clsx";
  import { twMerge } from "tailwind-merge";

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```
- **Config Customization**: If adding custom animations or styles (like gradients, border beams, grid backgrounds), define them inside `tailwind.config.js` or `styles.css` using custom `@keyframes` rather than hardcoding long ad-hoc inline strings.

## 2. Interactive Curations
- **Gradients & Glows**: Use dynamic gradient borders, border-beams, and glowing radial masks (`mask-image`) to make elements appear premium and high-fidelity.
- **Dynamic Background Grids**: Integrate CSS-only dot patterns or grid lines to form sleek, modern section backdrops.
- **Tailored Integration**: When copying components from 21st.dev or shadcn, adjust their design tokens (e.g. border-radii, colors, shadows) to strictly match the host application's pre-existing design system tokens. Never let an integrated component feel disconnected from the surrounding UI.
