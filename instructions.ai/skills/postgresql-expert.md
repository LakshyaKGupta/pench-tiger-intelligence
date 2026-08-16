# Skill: PostgreSQL Expert Engineering

Use this skill when designing schemas, writing migrations, optimizing queries, or reviewing any PostgreSQL database work. Data integrity at the DB layer is mandatory — never rely on app-level enforcement alone.

## 1. Schema Design & Integrity
- **NOT NULL by default**: Add `NULL` only when absence has explicit business meaning. Every table requires `created_at TIMESTAMPTZ DEFAULT now() NOT NULL`.
- **Use `TEXT` not `VARCHAR(n)`**: Unless a specific length constraint is a business rule, `TEXT` is correct. Use `BOOLEAN` for booleans, never integers.
- **Foreign keys with explicit rules**: Always name FK constraints and declare `ON DELETE CASCADE` or `ON DELETE SET NULL` — never leave it implicit.
- **DB-level check constraints**: Enforce value ranges and enums at the DB layer: `CONSTRAINT chk_confidence CHECK (confidence >= 0 AND confidence <= 1)`.
- **Migrations**: Use Alembic. Every migration must have a working `downgrade()`. Never edit a committed migration — always create a new one. Use `op.execute()` for data migrations.

## 2. Performance, Security & Advanced Features
- **Indexing**: Add partial indexes for hot filtered queries (`WHERE status = 'active'`). Add composite indexes for sort+filter (`agent_id, created_at DESC`). Add GIN indexes for JSONB columns. Run `EXPLAIN (ANALYZE, BUFFERS)` before and after — a `Seq Scan` on a large table is a red flag.
- **JSONB**: Use `@>` operator for containment queries. Index specific keys with expression indexes: `CREATE INDEX ON ledger ((evidence->>'source'))`.
- **Row-Level Security**: For multi-tenant systems, enable RLS and enforce `org_id = current_setting('app.current_org_id')::uuid` as a policy — not just in WHERE clauses.
- **Audit-proof ledger**: Block retroactive modification with `CREATE RULE no_delete_ledger AS ON DELETE TO ledger DO INSTEAD NOTHING`. Never allow UPDATE on append-only audit tables.
- **Connection pooling**: Configure `pool_size=10, max_overflow=20` in SQLAlchemy. Use pgBouncer in `transaction` mode for high-concurrency async workloads.
