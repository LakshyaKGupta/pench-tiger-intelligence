# Skill: Technical Documentation Generation

Use this skill when writing README files, API docs, docstrings, ADRs (Architecture Decision Records), OpenAPI descriptions, onboarding guides, or runbooks. Documentation is code — it must be accurate, versioned, and useful to a reader who does not know how the system works.

## 1. Documentation Principles
- **Example over description**: One working code example is worth ten paragraphs of prose. Every documented function or endpoint must include at least one usage example.
- **Write for the reader, not the author**: State the non-obvious. The reader doesn't know how it works — assume nothing. Explain what the code does, what it returns, what errors it can raise, and when to use it vs alternatives.
- **Keep docs close to code**: Inline docstrings for functions. README at the root. Runbooks in the repo. Docs that live far from code become stale and misleading.
- **Docstring format (Google style for Python)**: Document `Args`, `Returns`, `Raises`, and include at least one `Example`. For TypeScript, use JSDoc with `@param`, `@returns`, `@throws`, `@example`.
- **ADR format**: Context (why this decision was needed), Decision (what was chosen), Consequences (positive and negative), Alternatives Considered. Date it, status it, version it.

## 2. README & Runbook Standards
- **README structure**: Project name + one-sentence description → Quick Start (3 commands max to run) → What This Does (problem, approach, what it is NOT) → Architecture diagram → Configuration table → Development commands → API Reference link → Deployment link.
- **Configuration tables**: Every environment variable documented with name, required/optional, default value, and description. No undocumented config variables in production.
- **OpenAPI descriptions**: Every endpoint has `summary`, `description` (multi-line with business context), `operationId`, and `tags`. Never leave OpenAPI fields blank.
- **Runbook structure**: Symptoms → Diagnosis steps (exact commands with expected output) → Remediation (ordered steps) → Escalation path. A runbook must be executable by someone who has never seen the system before.
- **Accuracy gate**: Before marking documentation complete, execute every code example and command in the docs to confirm they work against the current codebase.
