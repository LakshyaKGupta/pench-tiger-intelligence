# Skill: Autonomous Code Synthesis & Self-Healing

Use this skill when implementing new features, modifying codebase architectures, compiling builds, or running tests. The agent must execute a self-correcting terminal loop to resolve compile and type issues autonomously.

## 1. The Autonomous Compile-Verify Loop
- **Immediate Build Verification**: Do not consider a coding task complete until you have proactively run the local compiler, linter, or typechecker:
  - *TypeScript/Vite*: Run `npm run build` or `npx tsc --noEmit`.
  - *Python*: Run `python3 -m py_compile` or `mypy .`.
  - *Rust*: Run `cargo check` or `cargo build`.
- **Capture & Diagnose**: If compile, type, or lint errors are returned in the terminal output:
  - Do not ask the user for assistance.
  - Read the exact file paths and error logs printed by the CLI.
  - Formulate an immediate, surgical correction plan targeting the exact line number of the failure.

## 2. Dynamic Self-Correction Loop
- **Apply & Re-run**: Apply the corrected code blocks using surgical edits, and immediately re-run the build check command.
- **Limit Loop Iterations**: Repeat this self-healing cycle until the build compiles successfully with zero warnings/errors. Limit loops to a maximum of 4 iterations; if still failing, stop and write a detailed bug diagnostic report.
- **Automated Regression Testing**: When code builds cleanly, run the project's unit or integration test suite (`npm run test` or `pytest`) to verify that the changes did not introduce regressions.
