# Skill: High-Performance Engineering & Optimization

Use this skill when optimizing algorithms, reducing network latency, profiling memory consumption, or building real-time systems.

## 1. Algorithmic & Memory Efficiency
- **Complexity Guardrails**: Avoid $O(N^2)$ algorithms (e.g. nested loops over large datasets). Opt for hash map lookups ($O(1)$) or pre-sorted operations ($O(N \log N)$).
- **Memory Leak Protection**: Proactively clean up all system resources:
  - Remove event listeners in frontend on component unmount.
  - Close database connections and file descriptors within `finally` blocks.
  - Avoid referencing short-lived objects inside long-lived global lists.
- **Lazy Loading**: Lazy-load large modules, non-critical components, and static images to keep initial bundle sizes tiny and load times lightning fast.

## 2. Network & State Efficiency
- **Request Batching**: Group multiple API requests into singular batch payloads to minimize HTTP overhead.
- **Caching Layering**: Cache heavy database results and static assets locally (in-memory) or via Redis with a strict Time-To-Live (TTL) configuration.
- **Fast Path Isolation**: Never block the main synchronous thread with heavy computing or network calls. Delegate heavy operations to background queues, celery workers, or asynchronous worker processes.
