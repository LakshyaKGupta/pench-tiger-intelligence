# Handoff And Session Continuity Rules

At the end of every completed task or implementation session, the AI agent MUST
update the project handoff file.

Preferred locations, in order:

1. `HANDOFF.md`
2. `ai-system/handoff.md`
3. `handoff.md`

If none exists and files were changed, create `HANDOFF.md` from
`/Users/lol/Docs/instructions.ai/templates/HANDOFF.md`.

The AI must document:

- what was implemented
- what files were modified
- what architecture decisions were made
- what dependencies were added
- what bugs/issues were discovered
- what remains incomplete
- what should happen next

The AI must maintain continuity between sessions so future agents and contributors can immediately understand:
- current system state
- implementation history
- pending work
- technical reasoning
- known constraints

---

# REQUIRED SESSION UPDATE FORMAT

After completing work, AI must append a new entry using this structure:

## Session Update - [DATE]

### Objective
- [What was requested]

### Completed
- [Features/tasks completed]

### Files Modified
- [List modified files]

### Architecture Decisions
- [Important technical decisions]

### Dependencies Added
- [Packages/tools added]

### Verification
- [Commands/checks run and result]

### Issues Found
- [Bugs, risks, edge cases]

### Pending Work
- [What still needs to be done]

### Notes For Next Agent
- [Critical context for future sessions]

---

# PROJECT MEMORY RULE

HANDOFF.md acts as the persistent project memory layer.

AI agents must treat this file as:
- operational memory
- architectural memory
- product continuity memory
- implementation history

The AI should continuously refine and maintain this file throughout the project lifecycle.

Failure to update HANDOFF.md after implementation is considered incomplete task execution.


# HANDOFF.md PURPOSE

## What This File Is

This file acts as the persistent operational memory and project continuity layer for AI agents and human contributors.

Every AI agent working on this project MUST read this file before making changes.

The goal is to:
- preserve architecture consistency
- preserve design quality
- prevent duplicate logic
- maintain project context across sessions
- document current progress
- reduce regressions
- maintain engineering standards

This file represents the current state of the project, ongoing decisions, technical direction, constraints, and implementation expectations.

---

# AI AGENT RESPONSIBILITIES

Before making any code changes, the AI agent MUST:

1. Read HANDOFF.md completely
2. Understand the project goals
3. Inspect existing architecture
4. Reuse existing patterns and components
5. Preserve design consistency
6. Preserve API contracts
7. Avoid duplicate business logic
8. Avoid unnecessary abstractions
9. Avoid unrelated file modifications
10. Explain implementation plan before coding

---

# WHAT THE AI MUST UNDERSTAND

The AI is NOT acting as:
- autocomplete
- rapid prototype generator
- random code generator

The AI IS expected to act like:
- senior engineer
- product-minded architect
- systems thinker
- scalable software contributor

The AI must optimize for:
- maintainability
- scalability
- readability
- consistency
- performance
- accessibility
- production readiness

---

# REQUIRED ENGINEERING BEHAVIOR

## Architecture

AI must:
- preserve folder structure
- preserve module boundaries
- keep logic modular
- separate UI from business logic
- avoid giant components/files
- prefer reusable abstractions

---

## Frontend

AI must:
- follow existing design system
- preserve typography consistency
- preserve spacing consistency
- maintain responsive behavior
- maintain accessibility
- include loading/error/empty states
- use smooth and purposeful animations only

---

## Backend

AI must:
- validate all inputs
- preserve API contracts
- add proper error handling
- add logging where needed
- avoid insecure patterns
- consider scalability implications
- use async/background processing where appropriate

---

## Performance

AI must:
- avoid unnecessary rerenders
- optimize bundle size
- lazy load where appropriate
- optimize database queries
- prevent memory leaks
- preserve smooth UX

---

# BEFORE IMPLEMENTATION

AI must first:
1. Explain understanding of the task
2. Explain affected systems
3. Explain implementation strategy
4. Identify possible risks
5. Identify reusable existing code

Only then should implementation begin.

---

# AFTER IMPLEMENTATION

AI must:
- review code quality
- simplify unnecessary complexity
- remove dead code
- verify responsiveness
- verify accessibility
- verify edge cases
- verify no regressions were introduced

---

# CURRENT PROJECT STATUS

## Active Features
- [List active systems here]

## Pending Features
- [List pending work here]

## Known Issues
- [List known bugs/issues]

## Current Architecture Decisions
- [Document important architecture choices]

## Current Design Decisions
- [Document UI/UX standards]

## Important Constraints
- [Document business/technical constraints]

---

# FINAL RULE

AI should always prioritize:
1. long-term maintainability
2. system consistency
3. production readiness
4. user experience quality
5. architectural clarity

---

## Session Update - 2026-05-19

### Objective
- Install GodMode globally for Codex/OpenCode and turn `/Users/lol/Docs/instructions.ai` into a universal instruction source for code and non-code AI work across IDEs.

### Completed
- Installed GodMode at `/Users/lol/.codex/godmode`.
- Linked GodMode skills into Codex discovery at `/Users/lol/.agents/skills/godmode`.
- Installed GodMode for OpenCode at `/Users/lol/.config/opencode/godmode`.
- Linked OpenCode plugin and skills into `/Users/lol/.config/opencode/plugins` and `/Users/lol/.config/opencode/skills`.
- Created the `instructions-ai` skill and linked it into Codex/OpenCode skill discovery.
- Rebuilt the instruction system with universal agent rules, lifecycle flow, quality gates, templates, IDE rule files, and a project bootstrap script.
- Added global pointer files for Codex and Claude.
- Added global rule symlinks for Cursor, Windsurf, Antigravity, and Trae.
- Added project-local templates for AGENTS, Claude, Gemini, Cursor, GitHub Copilot, JetBrains agents, Windsurf, Antigravity, project context, and handoff.

### Files Modified
- `/Users/lol/Docs/instructions.ai/README.md`
- `/Users/lol/Docs/instructions.ai/AGENTS.md`
- `/Users/lol/Docs/instructions.ai/universal-ai-flow.md`
- `/Users/lol/Docs/instructions.ai/handoff.md`
- `/Users/lol/Docs/instructions.ai/project_context.md`
- `/Users/lol/Docs/instructions.ai/quality-gates.md`
- `/Users/lol/Docs/instructions.ai/templates/*`
- `/Users/lol/Docs/instructions.ai/ide-rules/*`
- `/Users/lol/Docs/instructions.ai/scripts/bootstrap-project.sh`
- `/Users/lol/Docs/instructions.ai/skills/instructions-ai/SKILL.md`
- `/Users/lol/.codex/AGENTS.md`
- `/Users/lol/.claude/CLAUDE.md`

### Architecture Decisions
- Kept `/Users/lol/Docs/instructions.ai` as the single source of truth.
- Used symlinks for IDE/global discovery so updates to one file propagate everywhere.
- Kept global context generic and moved project-specific data into project templates.
- Used project-local bootstrap files because many IDE agents only reliably read instructions inside the current project.

### Dependencies Added
- None.

### Verification
- Verified GodMode skill symlink exists at `/Users/lol/.agents/skills/godmode`.
- Verified OpenCode plugin and skill symlinks exist.
- Verified Cursor, Windsurf, Antigravity, and Trae global rule symlinks exist.
- Ran `/Users/lol/Docs/instructions.ai/scripts/bootstrap-project.sh` against a temporary test project and confirmed it created all expected files.

### Issues Found
- `/Users/lol/Docs/instructions.ai` is a directory, not a single file. The system now treats it as an instruction package.
- Previous global `project_context.md` contained one specific EV project. It was replaced with a generic template to avoid polluting future projects.

### Pending Work
- Restart IDEs/agents so they reload global rules and skill discovery.
- For each existing project, run the bootstrap script once and customize that project's `PROJECT_CONTEXT.md`.

### Notes For Next Agent
- Always read `/Users/lol/Docs/instructions.ai/AGENTS.md` first.
- If a project lacks instruction files, run `/Users/lol/Docs/instructions.ai/scripts/bootstrap-project.sh /path/to/project`.
- Update the project handoff after meaningful changes.

---

## Session Update - 2026-07-15

### Objective
- Incorporate durable decision discipline for ambitious AI-product and
  intelligence-platform work after reviewing the proposed Personal Intelligence
  Platform and AI Learning OS directions.

### Completed
- Added an ambitious-product and AI-system protocol to the Lakshya collaboration
  guidance.
- Recorded that agents should distinguish a long-term vision from a measurable
  initial product wedge, surface operating trade-offs, and delay speculative
  orchestration until the core loop is validated.
- Added durable rules that complexity must earn its existence, future scope must
  remain an extension boundary rather than current implementation, and
  human-model inferences must be distinguished from observed evidence and
  self-report.

### Files Modified
- `/Users/lol/Docs/instructions.ai/WORKING_WITH_LAKSHYA.md`
- `/Users/lol/Docs/instructions.ai/handoff.md`

### Architecture Decisions
- Keep project-specific product requirements out of the global instruction
  package; capture them in the target project's context and specification once
  the objective is confirmed.

### Dependencies Added
- None.

### Verification
- Manually reviewed the inserted guidance against both supplied proposals and
  the existing instruction-system separation between global and project context.

### Issues Found
- The two proposals agree on the long-term vision but conflict on early process:
  one recommends a very large upfront specification, while the other prioritizes
  a narrow, usable v0.1. Resolve this before project implementation begins.

### Pending Work
- Confirm the AI Learning OS objective, target user, initial outcome, and v0.1
  boundary; then create the project-specific context and design specification.

### Notes For Next Agent
- Do not turn the personal-intelligence-platform vision into a global default or
  prematurely build a multi-agent "Jarvis." Start with the smallest adaptive
  learning loop that produces measurable evidence.

---

## Session Update - 2026-05-19

### Objective
- Clarify and improve whether `bootstrap-project.sh` automatically creates useful project context and whether one bootstrap run works across different IDEs.

### Completed
- Upgraded `/Users/lol/Docs/instructions.ai/scripts/bootstrap-project.sh` to auto-detect project context from existing files.
- Added detection for README title, package scripts, package manager, common frontend/backend frameworks, TypeScript, UI tooling, database tooling, testing frameworks, deployment files, env examples, Python projects, and style/config files.
- Added `PROJECT_CONTEXT.generated.md` behavior for projects that already have customized `PROJECT_CONTEXT.md`.
- Added `/Users/lol/Docs/instructions.ai/AUTO_CONTEXT.md` explaining what is automatic, what cannot be known automatically, and how cross-IDE behavior works.
- Updated `README.md`, `AGENTS.md`, and project `AGENTS.md` template to reference automatic context generation.
- Tested bootstrap on `/Users/lol/Docs/antigravity/stock market`; it created project-local instruction files and generated `PROJECT_CONTEXT.md`.

### Files Modified
- `/Users/lol/Docs/instructions.ai/scripts/bootstrap-project.sh`
- `/Users/lol/Docs/instructions.ai/AUTO_CONTEXT.md`
- `/Users/lol/Docs/instructions.ai/README.md`
- `/Users/lol/Docs/instructions.ai/AGENTS.md`
- `/Users/lol/Docs/instructions.ai/templates/AGENTS.md`
- `/Users/lol/Docs/antigravity/stock market/AGENTS.md`
- `/Users/lol/Docs/antigravity/stock market/CLAUDE.md`
- `/Users/lol/Docs/antigravity/stock market/GEMINI.md`
- `/Users/lol/Docs/antigravity/stock market/.cursorrules`
- `/Users/lol/Docs/antigravity/stock market/.github/copilot-instructions.md`
- `/Users/lol/Docs/antigravity/stock market/.junie/guidelines.md`
- `/Users/lol/Docs/antigravity/stock market/.cursor/rules/instructions-ai.mdc`
- `/Users/lol/Docs/antigravity/stock market/.windsurf/rules/instructions-ai.md`
- `/Users/lol/Docs/antigravity/stock market/.antigravity/rules/instructions-ai.md`
- `/Users/lol/Docs/antigravity/stock market/PROJECT_CONTEXT.md`
- `/Users/lol/Docs/antigravity/stock market/HANDOFF.md`

### Architecture Decisions
- Bootstrap should be run once per project folder, not once per IDE.
- Project-local instruction files are the compatibility layer for IDEs that do not reliably read global rules.
- Auto-generated context should not pretend to know business/product intent that is not present in files.

### Dependencies Added
- None.

### Verification
- Ran bootstrap on `/Users/lol/Docs/antigravity/stock market`.
- Re-ran bootstrap on the same folder to verify it preserves existing instruction files and refreshes generated context.
- Confirmed generated context included README title, npm command, Playwright, and FastAPI detection.

### Issues Found
- Automatic context can detect technical structure, but human/product details still need to be refined from README, docs, or direct user input.

### Pending Work
- Run bootstrap on other existing projects when ready.
- Customize each project's `PROJECT_CONTEXT.md` for business goals and known issues that cannot be inferred from files.

### Notes For Next Agent
- Do not promise full automatic business understanding from bootstrap alone.
- Use `PROJECT_CONTEXT.generated.md` as a technical snapshot when preserving customized project context.

---

## Session Update - 2026-06-14

### Objective
- Add durable Lakshya K. Gupta context and working-style instructions so future
  coding agents read and follow them automatically.
- Ensure projects bootstrapped with
  `/Users/lol/Docs/instructions.ai/scripts/bootstrap-project.sh "/your/project/path"`
  point all supported agent entry points at the new context.
- Remove the unrelated Raja/AgentShield instruction block from the requested
  model and replace it with Lakshya/Hiring Wallah context.

### Completed
- Added `/Users/lol/Docs/instructions.ai/LAKSHYA_CONTEXT.md` with durable owner,
  startup, career, product, thinking, and design context.
- Added `/Users/lol/Docs/instructions.ai/WORKING_WITH_LAKSHYA.md` with
  collaboration rules for strategic reasoning, clarification, coding, frontend
  quality, security, and verification.
- Updated global and project-local agent entry points to read both new files:
  `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, Cursor, Windsurf,
  Antigravity, Copilot, and Junie rules.
- Updated templates used by bootstrap so future projects inherit the new context.
- Updated `scripts/bootstrap-project.sh` so generated `PROJECT_CONTEXT.md`
  includes a "Global Owner Context" section.
- Added active skills better aligned with Lakshya's project work: React Expert,
  TypeScript Expert, Python FastAPI, PostgreSQL Expert, Testing Strategy,
  Architecture Review, SaaS Startup Review, and Security Best Practices.
- Fixed an existing bootstrap bug where detected file names were wrapped with
  shell command-substitution backticks instead of literal Markdown backticks.
- Added a Codex memory extension note pointing future Codex sessions to the new
  instructions.ai context files.

### Files Modified
- `/Users/lol/Docs/instructions.ai/LAKSHYA_CONTEXT.md`
- `/Users/lol/Docs/instructions.ai/WORKING_WITH_LAKSHYA.md`
- `/Users/lol/Docs/instructions.ai/AGENTS.md`
- `/Users/lol/Docs/instructions.ai/README.md`
- `/Users/lol/Docs/instructions.ai/CLAUDE.md`
- `/Users/lol/Docs/instructions.ai/GEMINI.md`
- `/Users/lol/Docs/instructions.ai/.cursorrules`
- `/Users/lol/Docs/instructions.ai/.cursor/rules/instructions-ai.mdc`
- `/Users/lol/Docs/instructions.ai/.windsurf/rules/instructions-ai.md`
- `/Users/lol/Docs/instructions.ai/.antigravity/rules/instructions-ai.md`
- `/Users/lol/Docs/instructions.ai/.github/copilot-instructions.md`
- `/Users/lol/Docs/instructions.ai/.junie/guidelines.md`
- `/Users/lol/Docs/instructions.ai/templates/AGENTS.md`
- `/Users/lol/Docs/instructions.ai/templates/CLAUDE.md`
- `/Users/lol/Docs/instructions.ai/templates/GEMINI.md`
- `/Users/lol/Docs/instructions.ai/templates/.cursorrules`
- `/Users/lol/Docs/instructions.ai/templates/copilot-instructions.md`
- `/Users/lol/Docs/instructions.ai/templates/junie-guidelines.md`
- `/Users/lol/Docs/instructions.ai/ide-rules/cursor-instructions-ai.mdc`
- `/Users/lol/Docs/instructions.ai/ide-rules/windsurf-instructions-ai.md`
- `/Users/lol/Docs/instructions.ai/ide-rules/antigravity-instructions-ai.md`
- `/Users/lol/Docs/instructions.ai/scripts/bootstrap-project.sh`
- `/Users/lol/Docs/instructions.ai/scripts/instructions-ai`
- `/Users/lol/Docs/instructions.ai/handoff.md`
- `/Users/lol/.codex/memories/extensions/ad_hoc/notes/2026-06-14-003509-lakshya-agent-context.md`

### Verification
- Ran `/Users/lol/Docs/instructions.ai/scripts/bootstrap-project.sh` against a
  temporary project and confirmed generated `AGENTS.md`, `PROJECT_CONTEXT.md`,
  Cursor, Windsurf, Antigravity, Claude, Gemini, Copilot, Junie, and
  `.cursorrules` files reference `LAKSHYA_CONTEXT.md` and
  `WORKING_WITH_LAKSHYA.md`.
- Confirmed generated `PROJECT_CONTEXT.md` includes a "Global Owner Context"
  section.
- Ran `python3 -m py_compile /Users/lol/Docs/instructions.ai/scripts/instructions-ai`.
- Ran `/Users/lol/Docs/instructions.ai/scripts/instructions-ai skills`; it
  listed active technical and design skills successfully.
- Searched instructions and the new memory note for `Raja`, `AgentShield`, and
  `Eplix AI (wound down)`. The only remaining hit is this handoff entry noting
  that the unrelated Raja/AgentShield prompt was intentionally removed.

### Notes For Next Agent
- Future project bootstraps should now create local agent files that reference
  `LAKSHYA_CONTEXT.md` and `WORKING_WITH_LAKSHYA.md`.
- Existing projects need bootstrap/sync rerun if their local agent files should
  be refreshed with the new references.

over:
- speed
- shortcuts
- unnecessary complexity
- temporary hacks
