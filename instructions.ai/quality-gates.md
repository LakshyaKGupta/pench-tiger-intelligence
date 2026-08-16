# Quality Gates

Use these gates before final response. Apply the relevant gates for the project
type and task size.

## Universal Gates

- Requirements match the user's actual request.
- Existing architecture and naming conventions are preserved.
- No unrelated files were changed.
- No secrets, tokens, credentials, private keys, or local-only paths were exposed.
- Errors and edge cases are handled.
- The project handoff was updated when files changed.

## Code Gates

- Tests were added or updated when behavior changed.
- Existing tests were run when practical.
- Lint/type/build checks were run when available.
- New dependencies are justified and minimal.
- Public interfaces are documented or obvious.
- No dead code, unused imports, or debug logs from this change.

## Frontend Gates

- Desktop and mobile layouts were considered.
- Loading, empty, error, disabled, and success states exist where relevant.
- Text fits containers and does not overlap.
- Keyboard and screen-reader accessibility are not broken.
- Visual style follows the local design system.
- Browser verification or screenshot review was performed for meaningful UI work.

## Backend Gates

- Inputs are validated.
- Authentication and authorization are respected.
- Database queries are bounded and indexed where needed.
- Database & Backend Performance Checklist ([database_audit.md](file:///Users/lol/Docs/instructions.ai/database_audit.md)) has been executed and passed.
- External calls handle timeout, retry, and failure cases appropriately.
- Logs are useful but do not leak sensitive data.
- Migrations and environment variables are documented.

## Data, Docs, And Research Gates

- Source data and assumptions are named.
- Output format is directly usable.
- Dates, versions, and external facts are verified when they could be stale.
- Ambiguity is called out instead of silently guessed.

## Completion Evidence

In the final response, include the verification actually run, for example:

- `npm test`
- `npm run build`
- `npm run lint`
- `pytest`
- `python -m compileall`
- Browser/screenshot check
- Manual review of generated document or spreadsheet

If a check was skipped, state why.
