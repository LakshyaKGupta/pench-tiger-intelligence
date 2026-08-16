# Project Agent Instructions

First read the global instruction system and active design/technical skills:

- `/Users/lol/Docs/instructions.ai/AGENTS.md`
- `/Users/lol/Docs/instructions.ai/LAKSHYA_CONTEXT.md`
- `/Users/lol/Docs/instructions.ai/WORKING_WITH_LAKSHYA.md`
- `/Users/lol/Docs/instructions.ai/universal-ai-flow.md`
- `/Users/lol/Docs/instructions.ai/handoff.md`
- `/Users/lol/Docs/instructions.ai/quality-gates.md`
- `/Users/lol/Docs/instructions.ai/AUTO_CONTEXT.md`
- **Active Developer Skills**:
  * Impeccable Style: `/Users/lol/Docs/instructions.ai/skills/impeccable.md`
  * Leonlnx Taste System: `/Users/lol/Docs/instructions.ai/skills/leonlnx-taste.md`
  * Emil Kowalski Animation Design: `/Users/lol/Docs/instructions.ai/skills/emil-kowalski-animations.md`
  * Framer Motion: `/Users/lol/Docs/instructions.ai/skills/framermotion.md`
  * UI/UX Pro Max: `/Users/lol/Docs/instructions.ai/skills/ui-ux-pro-max.md`
  * 21st.dev Curations: `/Users/lol/Docs/instructions.ai/skills/21st-dev.md`
  * Rigorous Reasoning: `/Users/lol/Docs/instructions.ai/skills/rigorous-reasoning.md`
  * Scientific Debugging: `/Users/lol/Docs/instructions.ai/skills/scientific-debugging.md`
  * Database Integrity: `/Users/lol/Docs/instructions.ai/skills/database-integrity.md`
  * React Expert: `/Users/lol/Docs/instructions.ai/skills/react-expert.md`
  * TypeScript Expert: `/Users/lol/Docs/instructions.ai/skills/typescript-expert.md`
  * Python FastAPI: `/Users/lol/Docs/instructions.ai/skills/python-fastapi.md`
  * PostgreSQL Expert: `/Users/lol/Docs/instructions.ai/skills/postgresql-expert.md`
  * Testing Strategy: `/Users/lol/Docs/instructions.ai/skills/testing-strategy.md`
  * Architecture Review: `/Users/lol/Docs/instructions.ai/skills/architecture-review.md`
  * SaaS Startup Review: `/Users/lol/Docs/instructions.ai/skills/saas-startup-review.md`
  * Security Best Practices: `/Users/lol/Docs/instructions.ai/skills/security-best-practices.md`
  * Performance Optimization: `/Users/lol/Docs/instructions.ai/skills/performance-optimization.md`
  * Secure Coding: `/Users/lol/Docs/instructions.ai/skills/secure-coding.md`
  * Stealth Browser Evasion: `/Users/lol/Docs/instructions.ai/skills/browser-automation.md`
  * Agentic Persistent Memory: `/Users/lol/Docs/instructions.ai/skills/persistent-memory.md`
  * Motion Design Principles: `/Users/lol/Docs/instructions.ai/skills/motion-principles.md`
  * Autonomous Agent Security: `/Users/lol/Docs/instructions.ai/skills/agent-security.md`
  * Self-Healing Code Synthesis: `/Users/lol/Docs/instructions.ai/skills/autonomous-self-healing.md`
  * Proactive Product Auditing: `/Users/lol/Docs/instructions.ai/skills/proactive-product-auditing.md`
  * Global Scale & i18n: `/Users/lol/Docs/instructions.ai/skills/internationalization.md`
  * Observability & Telemetry: `/Users/lol/Docs/instructions.ai/skills/observability.md`
  * Cloud DevOps Infrastructure: `/Users/lol/Docs/instructions.ai/skills/devops-infrastructure.md`
  * CI/CD Release Automation: `/Users/lol/Docs/instructions.ai/skills/cicd-pipelines.md`
  * Real-Time State Management: `/Users/lol/Docs/instructions.ai/skills/state-sync.md`

Then read the project files:

- `PROJECT_CONTEXT.md`
- `HANDOFF.md`

Follow the global lifecycle, preserve this project's architecture, verify changes,
and update `HANDOFF.md` after meaningful work.

---

## agent-skills: Engineering Workflow Skills

The `agent-skills` plugin is installed globally at `~/.gemini/config/plugins/agent-skills/`.
Before starting ANY non-trivial task, check whether a skill applies. **Skills are workflows, not suggestions.**

### Intent → Skill Mapping

| User Intent | Skill to Use |
|-------------|-------------|
| Vague idea / what to build | `interview-me` → `idea-refine` |
| New feature / functionality | `spec-driven-development` → `incremental-implementation` → `test-driven-development` |
| Planning / breakdown | `planning-and-task-breakdown` |
| Bug / error / unexpected behavior | `debugging-and-error-recovery` |
| UI / frontend work | `frontend-ui-engineering` |
| API or interface design | `api-and-interface-design` |
| Code review | `code-review-and-quality` |
| Refactoring / simplification | `code-simplification` |
| Security concerns | `security-and-hardening` |
| Performance issues | `performance-optimization` |
| Git / commits / branching | `git-workflow-and-versioning` |
| CI/CD pipelines | `ci-cd-and-automation` |
| Deprecating / migrating | `deprecation-and-migration` |
| Writing docs / ADRs | `documentation-and-adrs` |
| Adding logs / metrics / alerts | `observability-and-instrumentation` |
| Deploying / launching | `shipping-and-launch` |

### Slash Commands (Antigravity / Claude Code)

| Command | What it does |
|---------|-------------|
| `/spec` | Write a structured spec before writing code |
| `/planning` | Break work into small, verifiable tasks |
| `/build` | Implement the next task incrementally |
| `/build auto` | Full autonomous build — plan once, implement all tasks |
| `/test` | Run TDD workflow — red, green, refactor |
| `/review` | Five-axis code review before merge |
| `/code-simplify` | Reduce complexity without changing behavior |
| `/ship` | Pre-launch checklist, deploy, monitor |
| `/webperf` | Web performance audit (Core Web Vitals) |

### For OpenCode / Codex (no slash commands)

Internally follow: DEFINE → `spec-driven-development` | PLAN → `planning-and-task-breakdown` | BUILD → `incremental-implementation` + `test-driven-development` | VERIFY → `debugging-and-error-recovery` | REVIEW → `code-review-and-quality` | SHIP → `shipping-and-launch`

Skills: `~/.gemini/config/plugins/agent-skills/skills/<skill-name>/SKILL.md`
