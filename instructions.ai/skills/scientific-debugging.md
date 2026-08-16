# Skill: Scientific Debugging & Diagnostics

Use this skill when resolving bugs, system exceptions, or performance regressions. Guessing at code changes is strictly prohibited. You must use the formal scientific method.

## 1. The 4-Step Scientific Diagnostics Loop
- **Step 1: Document the Phenomenon**: Capture and write down the exact error trace, logs, network payload, and user input that triggered the bug.
- **Step 2: Formulate Hypotheses**: List all possible logical factors that could cause this error. Rank them by probability.
- **Step 3: Isolate Variables**: Test each hypothesis in isolation. Mock out external resources (like database writes, third-party APIs) to pinpoint the exact broken file and line.
- **Step 4: Verify the State Transition**: Trace and print the exact variable state before and after the failure to confirm the logical discrepancy.

## 2. Regression Protection
- **The Red-Green Test Pattern**: Prior to applying a bug fix, write a test (unit, integration, or terminal curl request) that fails on the unmodified code.
- **Apply the Surgical Fix**: Apply the narrowest possible logical fix that corrects the problem. Do not make unrelated changes.
- **Confirm the Green Pass**: Run the test again to confirm it passes. Ensure the fix does not break any existing test suites.
- **Document the Fix**: Leave a concise inline comment explaining *why* the bug occurred and what prevents it from recurring.
