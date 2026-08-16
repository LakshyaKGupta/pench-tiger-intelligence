# Skill: Agentic Persistent Memory & Handoff

Use this skill to maintain long-term memory, preserve architectural context, document design agreements, and ensure continuity across conversations and IDE restarts.

## 1. The Startup Memory Retrieval Sequence
- **Startup Sync**: Before proposing any code changes, read the persistent files containing the project's long-term memory:
  - `HANDOFF.md` or `ai-system/handoff.md` (Project progress, pending tasks, recent decisions)
  - `PROJECT_CONTEXT.md` (Target goals, tech stack, constraints, active architecture)
- **Identify Stale Memory**: If the local codebase does not match what the handoff describes, always trust the current codebase files and update the memory file immediately.

## 2. Memory Updates & Handoff
- **Handoff Contract**: When a task is completed or an agent turn ends, update `HANDOFF.md` with:
  - *Completed Items*: Concise, concrete list of files edited and what they accomplish.
  - *Current Status*: Current state of the server, build compilation, or database schema.
  - *Immediate Next Steps*: Clear, actionable tasks for the next agent or developer.
- **Architectural Logs**: If introducing a major change (such as adding an external service, changing a key table, or altering API authentication):
  - Document it in the architecture log section of `PROJECT_CONTEXT.md`.
  - Use exact JSON or structured Markdown lists to represent domain models, permissions, and dependencies.
