# Skill: Testing Strategy & Quality Engineering

Use this skill when writing tests, setting up test frameworks, achieving coverage goals, or auditing an existing test suite. Confidence at the lowest maintenance cost is the primary goal.

## 1. Test Design Principles
- **Tests must exist before refactoring**: Never restructure code without a passing test suite as a baseline. If tests don't exist, write them first.
- **Assert observable behavior, not implementation**: Tests that break on internal refactoring are liabilities. Assert what the user or API consumer sees, not how it works internally.
- **One assertion focus per test**: A test that checks five things is five tests. Name each test so the failure message is self-explanatory without reading the source.
- **No shared mutable state**: Tests must be fully isolated. Cleanup after each test. Tests that pass alone but fail together indicate a shared state bug — fix it, don't work around it.
- **No time-based waits**: Never use `time.sleep()` or `page.waitForTimeout()`. Use event-driven waits, explicit assertions with retry, or proper async patterns.

## 2. Framework Standards & Coverage Targets
- **Python (pytest)**: Use `pytest-asyncio` with `asyncio_mode = "auto"`. Use `httpx.AsyncClient(transport=ASGITransport(app=app))` for API tests. Fixtures in `conftest.py`. Use `pytest.mark.parametrize` for data-driven cases. Run `--cov=app --cov-report=term-missing`.
- **TypeScript/React (Vitest + Testing Library)**: Set `environment: "jsdom"`. Use `@testing-library/user-event` for interaction. Never query by CSS class or implementation detail — query by role, label, or text.
- **Playwright E2E**: Use `trace: "on-first-retry"`. Run E2E only in CI against a real DB via Docker Compose. Scope tests to critical user journeys, not every component.
- **Coverage targets**: Business logic 90%+, API route handlers 80%+, UI components 70%+, all critical user flows covered by E2E. Coverage number alone is not sufficient — mutation-test critical paths.
- **Verification**: Introduce a deliberate bug after writing tests to confirm at least one test catches it before marking work complete.
