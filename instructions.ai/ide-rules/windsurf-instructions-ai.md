# Universal AI Rules

Read and follow:

- `/Users/lol/Docs/instructions.ai/AGENTS.md`
- `/Users/lol/Docs/instructions.ai/LAKSHYA_CONTEXT.md`
- `/Users/lol/Docs/instructions.ai/WORKING_WITH_LAKSHYA.md`

Before changing files, inspect local project instructions, context, and handoff.
After meaningful work, verify the result and update the project handoff.


---

## agent-skills: Engineering Workflow Skills

Plugin installed at: `~/.gemini/config/plugins/agent-skills/`
Before starting ANY non-trivial task, check whether a skill applies. **Skills are workflows, not suggestions.**

### Intent → Skill

| User Intent | Skill |
|-------------|-------|
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

### Slash Commands (Claude Code / Antigravity)

`/spec` → spec before code | `/planning` → break into tasks | `/build` → implement incrementally | `/build auto` → full autonomous build | `/test` → TDD red-green-refactor | `/review` → five-axis review | `/code-simplify` → reduce complexity | `/ship` → launch checklist | `/webperf` → Core Web Vitals audit

### For Codex / OpenCode (no slash commands)

DEFINE → `spec-driven-development` | PLAN → `planning-and-task-breakdown` | BUILD → `incremental-implementation` + `test-driven-development` | VERIFY → `debugging-and-error-recovery` | REVIEW → `code-review-and-quality` | SHIP → `shipping-and-launch`

Skills: `~/.gemini/config/plugins/agent-skills/skills/<skill-name>/SKILL.md`
