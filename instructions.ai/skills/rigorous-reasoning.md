# Skill: Rigorous Reasoning & System Planning

Use this skill to guide your cognitive planning, avoid speculative fixes, and ensure your system architecture is logically airtight before writing code.

## 1. The Pre-Code Strategy Phase
- **Alternative Trade-off Analysis**: For any non-trivial implementation, explicitly state **three alternative strategies** to solve the problem. Evaluate them across:
  - *Time Complexity*: Algorithmic runtime ($O(N)$, $O(1)$, etc.)
  - *Developer Overhead*: Maintainability, readable abstractions, and lines of code.
  - *System Footprint*: Memory overhead, dependency bloat, and network latency.
- **Strict Logic-Tracing (CoT)**: Write down a step-by-step chain of execution, showing how data transforms from initial user input to final database or API output.

## 2. Exhaustive Boundary Analysis
- **Edge-Case Matrix**: Build a test checklist of potential boundary bugs before writing code. Test for:
  - *Null/Empty states*: `null`, `undefined`, empty lists `[]`, blank strings `""`.
  - *Numeric bounds*: `0`, negative numbers, maximum limits, potential overflow values.
  - *Timeout limits*: Slow APIs, database request timeouts, missing payloads.
- **Race Condition Guarding**: Inspect whether asynchronous tasks or rapid user inputs can run concurrently and corrupt data. If so, write strict mutex locks or transactional isolations.

## 3. The Self-Correction Check
- Prior to declaring a solution, review your own code changes and ask:
  1. *Does this introduce a duplicate abstraction?*
  2. *Is there a simpler way to achieve the exact same product objective?*
  3. *Are we exposing unnecessary internal data models to the client?*
