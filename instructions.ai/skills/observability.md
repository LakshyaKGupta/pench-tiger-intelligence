# Skill: System Observability & Telemetry

Use this skill when implementing telemetry, structured logging, request tracing, and systems monitoring metrics.

## 1. Structured Application Logging
- **Log Levels Discipline**: Strictly classify log entries using standard diagnostic levels:
  - `DEBUG`: Verbose variable states and internal trace loops.
  - `INFO`: Significant lifecycle landmarks (e.g. server startup, database connected).
  - `WARNING`: Recoverable anomalies (e.g. database retry, invalid user credentials input).
  - `ERROR`: System exceptions and failed operations (always include complete stack traces).
- **Structured Log Output**: Format logs as production-ready structured JSON payloads to enable easy parsing by monitoring systems (e.g. Datadog, ELK).

## 2. Request Tracing & Performance Metrics
- **Correlation Request IDs**: Inject a unique, trace-correlated Request ID header (`X-Request-ID`) at API gateways. Pass this ID dynamically down to all downstream functions, logs, and database queries.
- **System Metrics Monitoring**: Expose a dedicated, secure health and metrics API endpoint (e.g. `/v1/metrics` or `/metrics`) that outputs application telemetry, request counts, response latency bounds, active DB connection pools, and memory constraints.
