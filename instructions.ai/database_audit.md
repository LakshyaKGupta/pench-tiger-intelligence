# Database & Backend Performance Audit Checklist

Before marking any backend feature, API, service, migration, or database work as complete, always audit for:

## 1. N+1 Queries

Check for:
- queries inside loops
- ORM lazy-loading issues
- repeated database lookups
- duplicate joins
- repeated API calls

Output:
- **location**: File path, class, and method name
- **impact**: Estimated database query volume / execution complexity scaling factors
- **recommended optimization**: Code patterns, eager loading statements, bulk fetches, or prefetching setups

---

## 2. Pagination

Check all endpoints returning collections.
Flag if:
- returning unbounded results
- missing limit/offset
- missing cursor pagination
- loading entire tables into memory

Output:
- **affected endpoint**: Route path and method type
- **estimated scalability impact**: Payload sizes and memory footprint under concurrency
- **recommended pagination strategy**: Limit/Offset query implementation, Keyset/Cursor-based markers, or stream chunk constraints

---

## 3. Missing Indexes

Audit:
- WHERE clauses
- JOIN columns
- ORDER BY columns
- GROUP BY columns
- foreign keys

Output:
- **missing index**: The exact `CREATE INDEX` SQL definition statement
- **affected query**: The SQL or ORM lookup query experiencing sequential scan latency
- **estimated performance impact**: Estimated operational query speed gains and look-up time complexity reduction (e.g. O(N) to O(log N))

---

## 4. Connection Pooling

Verify:
- database connection pooling enabled
- connection reuse
- pool limits configured
- connection leaks

Flag:
- new connection per request
- connection per transaction
- connection per query

Output:
- **current behavior**: Socket lifecycle analysis
- **recommended pool configuration**: Concrete settings (e.g., min/max connections, timeout thresholds, pool class setup)

---

## 5. SELECT *

Flag all:
`SELECT *` or equivalent raw hydrates loading full table schema columns.

Require:
- explicit column selection
- minimal payload retrieval
- projection optimization

Output:
- **query location**: Path and line number of the query statement
- **replacement query**: The targeted selection query picking only specific fields

---

## Additional Checks

Audit for:
- full table scans
- unnecessary data hydration
- large object loading (e.g., text, JSONB blocks loaded when not needed)
- memory amplification (e.g., reading large result sets fully into Python memory before filtering)
- inefficient aggregation (e.g., counting rows in memory instead of database `COUNT(*)`)
- missing caching opportunities
- expensive synchronous operations blocking the main async loop

---

## Output Format

Every audit must end with:

### Database Health Score
`0-100`

### Critical Issues
- (list of showstoppers, vulnerabilities, and extreme scaling barriers)

### High Priority Issues
- (list of high-latency queries, lack of connection pooling, missing critical indexes)

### Medium Priority Issues
- (list of unbounded collection fetches, secondary missing indexes, redundant joins)

### Low Priority Issues
- (list of minor projection optimizations, select * cleanup in configuration/setup zones)

### Recommended Fix Order
1. [First action with highest ROI / security / stability impact]
2. [Second action...]
3. [Third action...]

---

## Operating Rule
> [!IMPORTANT]
> **Never approve a backend/database implementation without running this audit.**
> **Never assume scalability.**
> **Always verify with code evidence.**
> **Prefer measured benchmarks over theoretical concerns.**
