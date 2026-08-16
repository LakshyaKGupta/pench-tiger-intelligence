# Skill: UI/UX Pro Max

Every interface must have professional usability, outstanding accessibility, and extreme stability. Use this skill to craft premium, fault-tolerant user experiences.

## 1. Interactive States & Skeletons
- **Always Show Loading**: Any async event (fetching, updating, submitting) must have a visual spinner or skeleton state. Skeletons should mirror the physical grid of the loading content.
- **Empty States**: Never show a blank screen when lists are empty. Design beautiful empty states complete with illustrative SVG icons, clear descriptions, and secondary action CTAs.
- **Micro-feedback**: Trigger inline success messages or toast alerts when actions complete. On error, display red, helpful error dialogs that explain how to resolve the issue.

## 2. Forms & Advanced Inputs
- **Autofill & Semantics**: Use exact `autoComplete` attributes on forms (e.g. `email`, `current-password`, `new-password`, `tel`).
- **Inline Validation**: Provide immediate, non-intrusive feedback when input criteria are met or breached. Use `:user-valid` or react state bindings.
- **Action Protection**: Disable submit buttons while requests are pending, and overlay small indicators (`<span className="spin" />`) on active buttons.

## 3. Accessibility (a11y) & Keyboard Flow
- **Semantic HTML**: Use explicit semantic containers: `<header>`, `<main>`, `<aside>`, `<footer>`, `<section>`. Use buttons for click-triggers, never plain divs.
- **Keyboard Traps & Escape**: Dialogs/modals must trap keyboard tab focus, and close immediately when the `Escape` key is pressed.
- **Aria Attributes**: Include clear screen reader labels (`aria-label`, `aria-checked`, `aria-expanded`) on custom sliders, custom switches, or visual-only buttons.
- **Touch Target Padding**: Ensure all clickable links, chips, and targets have a minimum dimension of `44px x 44px` on mobile displays to allow comfortable tap actions.
