# Skill: Define Goal

Use this skill when the user explicitly asks to set a goal, define an objective, clarify success criteria, or translate a fuzzy intention into a quantitative, verifiable outcome.

## 1. Overview
Help the user define a concrete, measurable goal before starting work. Verifiable goals focus on outcomes, explicit evidence, and scope boundaries rather than vague activity descriptions.

## 2. Structure of a Verifiable Goal
A high-quality goal must explicitly define:
- **Outcome**: The specific state that will be true upon completion.
- **Scope**: What files, directories, repositories, or services are in scope (and what is explicitly out of scope).
- **Validator**: The binary or quantitative validation (e.g. tests passing, build succeeding, benchmark threshold met).
- **Evidence**: The command output, logs, or screenshots that verify success.
- **Stop Condition**: When the agent must stop and consult the user rather than continue loop iterations.

## 3. Formatting Guidance

### Good Goal Example
> Reduce checkout API p95 latency below 250ms on local load test `/v1/checkout` by implementing Redis cache for product details, verified by running `uv run locust -f test_locust.py` showing p95 under 250ms across 3 consecutive runs.

### Weak Goal Example
> Make the checkout faster. (Vague, has no baseline or verification command).

## 4. Quantification Heuristics
- **Bugs**: Define success as a reproducible failing test first, followed by a passing test after the fix.
- **Performance**: Name the specific metric (P50/P99 latency, memory footprint, bundle size), the target limit, the measurement tool, and the execution count.
- **Refactoring**: Specify the affected files, linting/typecheck commands, and zero change to observable behavior.
- **Research**: Name the specific technical decision or architecture question that the research must answer.
