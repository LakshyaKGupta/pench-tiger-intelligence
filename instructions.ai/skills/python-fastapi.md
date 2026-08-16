# Skill: Python & FastAPI Expert Engineering

Use this skill when writing, reviewing, or debugging Python services and FastAPI backends. Production correctness is the goal, not just working code.

## 1. Python & FastAPI Patterns
- **Type annotations everywhere**: Function signatures, class attributes, and non-obvious variable assignments all require type hints. Use `from __future__ import annotations` for forward references.
- **Pydantic v2 discipline**: Separate request and response models — never expose SQLAlchemy models directly in API responses. Use `model_config = ConfigDict(strict=True)` for input schemas. Validate at the boundary, not inside business logic.
- **Explicit routing**: Every route declares `response_model`, `status_code`, and `tags`. Use `APIRouter(prefix="/v1/...", tags=["..."])` per domain. POST creating a resource returns 201, not 200.
- **Async correctness**: All route handlers use `async def`. Never block the event loop with synchronous I/O. Use `anyio.to_thread.run_sync()` for CPU-bound work. Use `asyncio.gather()` for concurrent I/O.
- **Dependency injection for DB sessions**: Yield sessions via `Depends(get_db)`. Use `AsyncSession` from `sqlalchemy.ext.asyncio`. Never use the legacy `Query` API.

## 2. Testing, Tooling & Production Hardening
- **Testing**: Use `pytest-asyncio` with `asyncio_mode = "auto"`. Use `httpx.AsyncClient(transport=ASGITransport(app=app))` for API tests — never run a live server in tests.
- **Package management**: Use `uv` exclusively (`uv venv`, `uv pip install`, `uv run pytest`, `uv run uvicorn`). No bare `pip` in project commands.
- **Error handling**: Define typed exception handlers at the app level. Never return 500 with a raw exception message — log it and return a sanitized response.
- **Production checklist**: Add `lifespan` context for startup/shutdown. Never log request bodies with PII. Set `X-Request-ID` middleware. Parameterize all queries — no string concatenation with user input.
- **Verification**: `uv run pytest --tb=short -q` and `uv run mypy app/ --ignore-missing-imports` must both pass before declaring work done.
