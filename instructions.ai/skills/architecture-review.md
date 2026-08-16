# Skill: Architecture Review & System Design

Use this skill when evaluating system design, proposing an architecture, reviewing API contracts, auditing for structural smells (god objects, tight coupling, circular dependencies), or planning a service decomposition.

## 1. Structural Evaluation
- **Coupling audit**: Services/modules that must deploy together are a distributed monolith. Shared mutable DB tables between services break service autonomy. Circular imports and deep relative paths (`../../../core/utils/helpers`) signal structural coupling that must be resolved with dependency inversion.
- **Cohesion check**: Every module or service must have exactly one reason to change. Files over ~500 lines usually violate SRP — audit them for extraction. God objects that know about too many domains are architecture smells.
- **API contract completeness**: Every interface must define its input contract (types, required vs optional), output contract (what is always present), error contract (all error codes and conditions), and versioning strategy (how breaking changes will be managed). Use `/v1/` prefixes. Never use `/api/` unversioned.
- **Data model soundness**: If the model can represent invalid states, the model is wrong. Enforce constraints at the DB layer, not only in application code. Document soft-delete vs hard-delete decisions explicitly.

## 2. Scalability, Operability & Anti-Patterns
- **Scalability dimensions**: Identify read vs write asymmetry (cache candidates), write contention on hot rows, unbounded append tables, O(n) endpoints that fan-out per user, and external calls in the hot path.
- **Operational fitness**: Every service needs a `/health` endpoint, structured logs with request IDs, metrics and traces, a documented deployment strategy, and a tested rollback plan.
- **Call out anti-patterns directly**: Distributed monolith (tightly coupled microservices), chatty APIs (N calls where 1 suffices), premature optimization (complexity without proven scale need), config hardcoded in source files.
- **ADR for every significant decision**: Format — Context, Decision, Consequences (positive and negative), Alternatives Considered. Date and status every ADR.
- **Review output format**: Summary → Critical Issues (block shipping) → Significant Improvements (1 sprint) → Nice-to-Haves (backlog).
