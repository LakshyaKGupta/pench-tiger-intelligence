# Skill: Address GitHub PR Comments

Use this skill when processing feedback, code reviews, or issue comments on an open GitHub Pull Request for the current branch.

## 1. Overview
Retrieve active PR review comments, present a structured summary of requested changes, execute the selected modifications, and update the PR.

## 2. GitHub CLI (gh) Preflight
1. Ensure the GitHub CLI (`gh`) is installed and authenticated.
2. Run `gh auth status` to check active session authorization.
3. If not authenticated, prompt the user to log in locally with `gh auth login`.

## 3. Workflow
1. **Fetch Comments**: Retrieve the active PR discussion threads using `gh pr view --comments` or `gh api`.
2. **Present Changes**: Group and number the feedback items by file and line number. Present a brief summary of the proposed code edits to the user.
3. **Confirm & Execute**: Ask the user to confirm which numbered feedback items to resolve. Apply surgical edits to the codebase, verify with local tests, and commit/push the resolved changes.
