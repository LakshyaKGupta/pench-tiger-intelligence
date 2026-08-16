# Skill: Safe Codebase Refactoring

Use this skill when restructuring, extracting, renaming, or simplifying code without changing observable behavior. Refactoring without a test baseline is prohibited.

## 1. Safety-First Protocol
- **Tests first, always**: Before touching any code, confirm a passing test suite exists. If it doesn't, write the tests first. Run them to establish a baseline. A refactor without tests is a change without a safety net.
- **One refactoring type per commit**: Extract in one commit. Rename in another. Restructure in another. Never combine refactoring with feature work — a combined commit makes rollback impossible.
- **Each step must leave working code**: Every intermediate state must be runnable. Never leave the codebase broken between commits during a refactor.
- **Never comment out dead code**: Delete it. Git history preserves it. Commented-out code rots and misleads the next reader.
- **DRY at 3, not 2**: If logic appears in 2 places, wait. If it appears in 3+, extract it. Premature abstraction is worse than duplication.

## 2. Refactoring Patterns & Verification
- **Extract Function/Component**: Extract when a function exceeds ~40 lines or has more than one responsibility. Extract a React component when it exceeds ~150 lines or its JSX appears in 2+ places. Name the extracted unit by what it does, not where it came from.
- **Replace magic numbers with named constants**: `const HIGH_CONFIDENCE_THRESHOLD = 0.85` over a bare `0.85` in a condition.
- **Flatten callback hell**: Rewrite nested `.then()` chains to `async/await`. Rewrite nested conditionals to early-return guards.
- **Large file strategy**: Files over 500 lines — list all top-level declarations, group by domain, split into one file per group, re-export through an index file to preserve import paths.
- **Safe rename**: Use IDE refactoring tools when possible. After any rename, `grep` the entire codebase for string references to the old name (route strings, config keys, docs).
- **Verification**: Full test suite passes. `tsc --noEmit` (or equivalent) zero errors. `git diff --stat` scope matches intention. User-visible behavior manually confirmed unchanged.
