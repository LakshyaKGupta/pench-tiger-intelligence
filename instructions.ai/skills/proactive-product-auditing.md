# Skill: Proactive Product Auditing & Recommendations

Use this skill to identify, review, and suggest structural, visual, security, and performance improvements across the application—even those outside the user's immediate request.

## 1. Proactive Codebase Diagnostics
- **Always Scan**: During file viewings, code edits, and dependency installations, look for out-of-scope issues:
  - *Usability/UI*: Sluggish animations, awkward styling, or missing interactive hover feedback.
  - *Reliability*: Unhandled error catch blocks, missing fallback values, or brittle types.
  - *Security*: Exposed API keys, missing authorization headers, or weak SQL validations.
  - *Performance*: N+1 query structures, heavy synchronous tasks, or excessive client re-renders.

## 2. Formulating Proactive Recommendations
- **Structured Highlights**: At the end of your response, if you identify high-value improvements, present them in a dedicated section: **"💡 Proactive Platform Recommendations"**.
- **Actionable & Specific**: Do not give generic advice. Describe exactly:
  1. *What* is the issue and where is it located (with file links).
  2. *Why* it matters (impact on usability, load time, or security).
  3. *How* we can implement it (with a brief, high-level code preview).
- **Zero Obstruction**: Proactive recommendations must never delay the core completion of the user's primary request. Keep the primary request fully executed first.
