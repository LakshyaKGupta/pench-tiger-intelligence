# Skill: Impeccable

Use this skill to write clean, robust, perfectly architected, and self-documenting code with zero-bug mentality.

## 1. Code Architecture & Cleanliness
- **Surgical Execution**: Do not rewrite large blocks of code when minor modifications suffice. surgical changes keep git diffs readable.
- **Maintain Contracts**: Never break existing API signatures, database schemas, or service interfaces unless explicitly requested.
- **Dry & Reusable**: Extract duplicate business logic into clean utility helpers. Avoid copying and pasting code.
- **Single Responsibility**: Keep files, functions, and components focused on a single logical responsibility. Keep components under 300 lines.
- **Self-Documenting Code**: Write clear, explanatory variable and function names. Use short, crisp inline comments to document the *why*, not the *what*.

## 2. Strong Typing & Validation
- **Strict Typing**: If working in TypeScript, Python (type hints), or Java, type everything explicitly. Avoid using `any` or empty interfaces.
- **Input Sanitization**: Never trust external data. Validate inputs using defensive techniques (e.g. Zod schemas in JS, Pydantic in Python, strong database constraints).
- **Error Boundaries**: Wrap network calls, database queries, and async interactions in try-catch blocks with helpful user feedback and internal error logging.

## 3. Defense Against Regressions
- **Idempotence**: Operations, migrations, and scripts must be safely runnable multiple times without causing data duplication or crashes.
- **No Speculation**: Write code that directly solves the active acceptance criteria. Never add speculative or "just in case" features.
- **Immaculate Formatting**: Maintain consistent indentation, semicolons, brackets, and import ordering matching the host project rules.
