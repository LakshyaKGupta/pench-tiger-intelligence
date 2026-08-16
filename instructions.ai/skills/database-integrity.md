# Skill: Database Architecture & Data Integrity

Use this skill when designing databases, writing database schemas, updating tables, or executing queries. Maintaining absolute data consistency is your primary objective.

## 1. ACID & Transactional Discipline
- **Atomicity (All-or-Nothing)**: Wrap any multi-step write operation (e.g. creating a user AND initializing their workspace) in a strict database transaction block (`BEGIN`, `COMMIT`, `ROLLBACK`). If any step fails, abort the entire transaction.
- **Isolation Levels**: Use the appropriate database transaction isolation level (e.g. `READ COMMITTED` or `SERIALIZABLE`) to prevent dirty reads, non-repeatable reads, or phantom records under concurrent execution.

## 2. Structural Integrity & Performance
- **Foreign Key Constraints**: Enforce structural relations with foreign keys. Set explicit delete rules (`ON DELETE CASCADE` or `ON DELETE SET NULL`) to prevent orphaned rows.
- **Index Optimization**: Add database indexes to any column used frequently in `WHERE` clauses, `JOIN` conditions, or `ORDER BY` operations. Avoid over-indexing, as it slows down write operations.
- **N+1 Prevention**: Explicitly inspect queries inside loops. Batch database queries using select-joins, eager-loading, or prefetching rather than executing queries in iterative loops.
- **Idempotency in Migrations**: Schema migrations must be idempotent. Always use `IF NOT EXISTS` or check database state before altering tables or columns.
