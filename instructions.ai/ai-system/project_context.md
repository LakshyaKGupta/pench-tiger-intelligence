# Global Project Context Template

This file is intentionally generic because it is shared across all projects.
Copy `templates/PROJECT_CONTEXT.md` into each project and customize it there.

## Behavioral Guidelines

### Think Before Executing

- State assumptions explicitly.
- Present multiple interpretations if they materially affect the result.
- Push back when a simpler or safer approach is better.
- Stop and name confusion before implementing.

### Simplicity First

- Use the minimum robust solution that satisfies the request.
- Do not add speculative features.
- Do not create abstractions for single-use code.
- Prefer clarity over cleverness.

### Surgical Changes

- Touch only what is necessary.
- Match existing style and architecture.
- Remove imports, variables, files, or generated artifacts introduced by the work
  if they are no longer needed.
- Do not remove pre-existing code unless explicitly asked or required.

### Goal-Driven Execution

- Convert work into verifiable criteria.
- For multi-step tasks, state a brief plan and verification checks.
- Treat documentation, design, data, and operational work with the same quality
  bar as code.

## Project-Specific Data

Do not store one project's details in this global file. Each project should have:

- `PROJECT_CONTEXT.md`
- `HANDOFF.md`
- Optional `ai-system/project_context.md`
- Optional `ai-system/handoff.md`
