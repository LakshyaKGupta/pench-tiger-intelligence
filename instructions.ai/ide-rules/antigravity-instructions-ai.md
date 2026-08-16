# Universal AI Rules

Read and follow:

- `/Users/lol/Docs/instructions.ai/AGENTS.md`
- `/Users/lol/Docs/instructions.ai/LAKSHYA_CONTEXT.md`
- `/Users/lol/Docs/instructions.ai/WORKING_WITH_LAKSHYA.md`

This applies to code, design, documents, data, automation, deployment, and
research. Read project context first, make scoped changes, verify, and update
handoff.

---

## agent-skills: Engineering Workflow Skills

Plugin installed at: `~/.gemini/config/plugins/agent-skills/`
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

### Slash Commands

| Command | What it does |
|---------|-------------|
| `/spec` | Structured spec before writing code |
| `/planning` | Break work into small, verifiable tasks |
| `/build` | Implement the next task incrementally |
| `/build auto` | Full autonomous build |
| `/test` | TDD workflow — red, green, refactor |
| `/review` | Five-axis code review |
| `/code-simplify` | Reduce complexity |
| `/ship` | Pre-launch checklist, deploy, monitor |
| `/webperf` | Web performance audit |

Skills: `~/.gemini/config/plugins/agent-skills/skills/<skill-name>/SKILL.md`
