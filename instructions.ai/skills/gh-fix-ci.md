# Skill: Diagnose & Fix GitHub CI Failures

Use this skill when debugging or fixing failing GitHub Actions CI/CD workflows, check runs, or unit tests on an active Pull Request.

## 1. Overview
Leverage the GitHub CLI (`gh`) to retrieve failing workflow run details, inspect log outputs, isolate failure snippets, and propose structural fixes.

## 2. GitHub CLI Preflight
Ensure the GitHub CLI is authenticated. Run `gh auth status` (verifying `repo` and `workflow` scopes). Prompt the user to execute `gh auth login` locally if unauthenticated.

## 3. Workflow
1. **Resolve Pull Request**: Find the open PR for the current branch using `gh pr view --json number,url`.
2. **Retrieve PR Checks**: Fetch status checks using the CLI command:
   ```bash
   gh pr checks {PR-NUMBER} --json name,state,link,workflow
   ```
3. **Download Job Logs**: For any failing check, extract the Actions Run ID from the link URL and retrieve logs:
   ```bash
   gh run view {RUN-ID} --log
   ```
   If a check runs on an external provider (e.g. Buildkite, CircleCI, Vercel), mark it as external and present the details URL.
4. **Isolate Failures**: Identify and display a concise snippet of the test or compilation failure.
5. **Formulate Fix**: Create a targeted code repair plan, explain the root cause, obtain user approval, execute the fix, and trigger a check rerun using `gh run rerun {RUN-ID}`.
