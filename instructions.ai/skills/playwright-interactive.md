# Skill: Playwright Interactive Browser

Use this skill when performing manual or interactive browser testing, visual quality assurance, capturing UI screenshots, or debugging web applications.

## 1. Overview
Enables a persistent Playwright session to iteratively test and debug user interfaces, inspect elements, verify layout breakpoints, and capture screenshots.

## 2. Core Workflow
1. **Prepare QA Inventory**: Define the list of user-visible features, controls, and states to verify before signing off.
2. **Setup Playwright**: Install Playwright (`npm install playwright`) and install browser binaries (`npx playwright install chromium`).
3. **Launch Browser**: Start a headed Chromium browser instance with custom viewports (e.g., `1600x900` for desktop, `390x844` for mobile).
4. **Interactive Iteration**: Interact with the page, trigger state transitions, and verify responsive layout behavior.
5. **Visual Inspection**: Manually check layout alignment, contrast, animations, typography, and viewport sizing.
6. **Capture Evidence**: Save screenshots of key states for validation.

## 3. Viewport-Fit & Layout Validation

### Above-The-Fold & Layout Fit
- Verify the initial view loads without clipping, overlap, layout shifting, or text truncation.
- Ensure essential controls (buttons, navigation elements, critical messages) are fully visible without requiring scrolling.
- For fixed-height dashboards or shells, disable vertical scroll on the outer container and check for overflow clipping.

### Numeric Viewport Diagnostics
Run in the browser console to gather layout metrics:
```javascript
console.log({
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  scrollWidth: document.documentElement.scrollWidth,
  scrollHeight: document.documentElement.scrollHeight,
  canScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  canScrollY: document.documentElement.scrollHeight > document.documentElement.clientHeight,
});
```
Check individual component bounds using `.getBoundingClientRect()` to isolate hidden container overflows.
