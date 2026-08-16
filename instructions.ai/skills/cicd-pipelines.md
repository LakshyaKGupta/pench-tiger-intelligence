# Skill: CI/CD Quality Gates & Release Automation

Use this skill when designing automated deployment scripts, GitHub Actions workflows, pre-commit hooks, or zero-downtime release pipelines.

## 1. Automated Quality Gates
- **Pre-Commit Linting**: Configure pre-commit hooks (e.g. using Husky, lint-staged, or pre-commit) to enforce linting, formatting, and quick typechecks locally before commits are allowed.
- **Continuous Integration Checks**: Design GitHub Actions or GitLab pipelines that trigger on every Pull Request to enforce:
  - Strict lint checking (`npm run lint` or `flake8`).
  - Strict type checking (`npm run typecheck` or `mypy`).
  - Unit and integration test suites execution (`npm run test` or `pytest`).
  - Compiling production bundles to catch build errors early.

## 2. Zero-Downtime Releases & Notifications
- **Deployment Strategies**: Structure release scripts to support zero-downtime rolling updates, blue-green deployments, or canary releases to avoid service interruptions.
- **Alert & Health Callbacks**: Add post-deployment webhook callbacks that send system status summaries and Git diff changelogs directly to developers (e.g. via Slack or Discord) upon successful releases.
