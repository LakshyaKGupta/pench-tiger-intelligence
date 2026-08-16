# Skill: DevOps & CI/CD Expert

Use this skill when designing GitHub Actions workflows, Docker containers, local docker-compose environment files, secrets setups, or deployment infrastructure.

## 1. GitHub Actions Standards

### CI Pipeline Template

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports: ["5432:5432"]

    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv pip install -r requirements.txt
      - run: uv run pytest --tb=short -q
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          SECRET_KEY: test-secret-key-not-real

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv run ruff check .
      - run: uv run mypy app/ --ignore-missing-imports
```

### CD Pipeline (Merge to Main → Deploy)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    needs: [test, lint]  # Never deploy if CI fails
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## 2. Docker Standards

### Multi-Stage Dockerfile (Python)

```dockerfile
# Build stage
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.12-slim AS runtime
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY app/ ./app/
# Never run as root
RUN useradd -m appuser
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml for Local Dev

```yaml
version: "3.9"
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://dev:dev@db:5432/agentshield_dev
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./backend:/app  # hot-reload in dev

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: agentshield_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev"]
      interval: 5s
      retries: 5

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    command: npm run dev

volumes:
  postgres_data:
```

## 3. Secrets Management

### What Goes Where

| Secret | Storage |
|--------|---------|
| API keys, tokens | GitHub Secrets (CI) / Railway env |
| DB passwords | Never in code; env var only |
| JWT secret | 32+ char random, env var |
| Stripe keys | Env var (never client-side) |
| `.env.example` | In repo (without real values) |
| `.env` | In `.gitignore` ALWAYS |

```bash
# Generate a secure secret
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## 4. Deployment Platforms

### Railway (recommended for FastAPI)
```bash
railway init
railway link
railway up
railway logs
railway env set DATABASE_URL=postgresql://...
```

### Render
- Use `render.yaml` for IaC:
```yaml
services:
  - type: web
    name: agentshield-backend
    runtime: python
    buildCommand: pip install -r requirements.txt && alembic upgrade head
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: agentshield-db
          property: connectionString
```

## 5. Production Checklist

- [ ] Health check endpoint: `GET /health → {"status": "ok", "version": "..."}`
- [ ] Startup runs DB migrations before serving traffic
- [ ] Zero-downtime deploy strategy (rolling update or blue-green)
- [ ] Rollback procedure documented and tested
- [ ] Error monitoring connected (Sentry)
- [ ] Uptime monitoring configured (Better Uptime, Checkly)
- [ ] Log aggregation (Datadog, Papertrail)
- [ ] All secrets in env vars, not `.env` files committed

## 6. Environment Parity

Dev, staging, and prod must be **identical in structure**, different only in:
- Database connection strings
- Secret values
- Log levels (DEBUG in dev, INFO in prod)

Never have code paths that only run in production.
