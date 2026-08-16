# Skill: Stealth Browser & Accessibility Tree Automation

Use this skill when automating browser tasks, scraping visual content, auditing layouts, or performing end-to-end browser integrations. Raw CSS/XPath selectors are brittle; use accessibility trees and stealth configurations.

## 1. Stealth Navigation & Bot Evasion
- **Stealth Configuration**: Always configure browsers with stealth plugins (e.g. Playwright-Stealth, Puppeteer Extra Stealth) to bypass Cloudflare, Akamai, and CAPTCHA walls.
- **User-Agent & Fingerprint Spofing**: Randomize screen viewports, emulate realistic human mouse curves, randomize keystroke delays (50ms - 150ms), and send real browser request headers.
- **No-Headless Detection Bypass**: When executing critical flows, run in headless-new mode or emulate screen framebuffers (`xvfb`) to avoid bot detection flags.

## 2. Accessibility Tree & ARIA Targeting
- **The a11y Tree Advantage**: Instead of using brittle HTML class selectors (which change dynamically), inspect the browser's Accessibility Tree (AX Tree) to target elements by their persistent semantic ARIA roles:
  - Prefer: `page.get_by_role("button", name="Create account")`
  - Avoid: `page.locator(".btn-primary.auth-submit")`
- **Interactive Element Overlays (Vimium Style)**: If selecting an element is ambiguous, inject a client script to overlay unique numerical tags (1, 2, 3...) next to all interactive nodes (`a`, `button`, `input`). The agent can then target the precise index directly.

## 3. Dynamic Wait Strategies
- **Actionability Checks**: Never use static sleep timers (`time.sleep(5)`). Always wait for network-idle states, or wait for elements to satisfy the four actions of actionability:
  1. *Attached* to the DOM.
  2. *Visible* in the viewport.
  3. *Stable* (not animating/moving).
  4. *Enabled* (receives click pointer events).
