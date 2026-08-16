# Skill: Performance Profiler & Optimization Expert

Use this skill when diagnosing slow API responses, high CPU/memory usage, slow React page loads/re-renders, DB query performance, large bundle sizes, or Core Web Vitals issues.

## 1. The Golden Rule

> Profile first. Optimize second. Never guess.

Establish a baseline measurement before changing anything.

## 2. Backend Performance (FastAPI/Python)

### Step 1: Measure Baseline
```bash
# API load test with wrk
wrk -t4 -c100 -d30s http://localhost:8000/v1/screen

# Or with locust
locust -f locustfile.py --host=http://localhost:8000
```

### Step 2: Profile Async Code
```python
import cProfile
import asyncio

async def main():
    profiler = cProfile.Profile()
    profiler.enable()
    await your_endpoint_function()
    profiler.disable()
    profiler.print_stats(sort='cumulative')
```

### Step 3: Find Slow DB Queries
```python
# SQLAlchemy query logging
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

```sql
-- Find slow queries in production
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Common FastAPI Performance Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| N+1 queries | Slow list endpoints | Eager load with `joinedload()` |
| Missing index | Slow filtered queries | `EXPLAIN ANALYZE` + add index |
| Blocking I/O | CPU spike, async queue builds up | Use `anyio.to_thread.run_sync()` |
| No connection pool | Connection errors at scale | Set `pool_size`, `max_overflow` |
| Serialization cost | Slow JSON responses | Profile with cProfile, use `orjson` |

### Caching Strategy
```python
from functools import lru_cache
from redis import Redis

# In-memory cache for rarely-changing data
@lru_cache(maxsize=128)
def get_agent_config(agent_id: str): ...

# Redis cache for shared, TTL-based data
async def get_org_plan(org_id: str) -> Plan:
    cached = await redis.get(f"plan:{org_id}")
    if cached:
        return Plan.parse_raw(cached)
    plan = await db.query(Plan).filter_by(org_id=org_id).first()
    await redis.setex(f"plan:{org_id}", 300, plan.json())  # 5 min TTL
    return plan
```

## 3. Frontend Performance (React)

### Step 1: React DevTools Profiler
- Open React DevTools → Profiler tab → Record.
- Identify components with high `self time`.
- Look for unnecessary re-renders (gray bars = re-render).

### Step 2: Fix Unnecessary Re-renders
```tsx
// BAD: New function on every render
<Button onClick={() => handleClick(id)} />

// GOOD: Memoized callback
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// BAD: Object literal as prop (new reference every render)
<Chart options={{ color: "red" }} />

// GOOD: Stable reference
const chartOptions = useMemo(() => ({ color: "red" }), []);
<Chart options={chartOptions} />
```

### Step 3: Bundle Analysis
```bash
# Vite bundle analyzer
npx vite-bundle-visualizer

# Check what's large:
# - Lodash: use lodash-es and tree-shake, or use native alternatives
# - Moment.js: use date-fns or dayjs
# - React Icons: import individual icons, not the entire set
```

### Step 4: Core Web Vitals

| Metric | Target | Primary Cause |
|--------|--------|--------------|
| LCP (Largest Contentful Paint) | < 2.5s | Large images, render-blocking resources |
| INP (Interaction to Next Paint) | < 200ms | Long JS tasks, blocking handlers |
| CLS (Cumulative Layout Shift) | < 0.1 | Missing image dimensions, late-loading fonts |

```html
<!-- Fix LCP: preload hero image -->
<link rel="preload" as="image" href="/hero.webp" />

<!-- Fix CLS: explicit dimensions -->
<img src="/logo.png" width="200" height="60" alt="Logo" />

<!-- Fix INP: defer non-critical JS -->
<script defer src="/analytics.js"></script>
```

## 4. Performance Budget

| Metric | Budget |
|--------|--------|
| JS bundle (gzipped) | < 200KB initial load |
| API P50 | < 50ms |
| API P95 | < 200ms |
| API P99 | < 500ms |
| Time to Interactive | < 3s on 3G |

## 5. Reporting

After profiling, always report:
1. **Baseline measurement** (before)
2. **Identified bottleneck** (root cause, not symptom)
3. **Fix applied**
4. **After measurement** (proof of improvement)
5. **Remaining work** (what's still slow)
