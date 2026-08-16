# Skill: Autonomous Agent Security

Use this skill when developing AI agents, multi-agent frameworks, tool integrations, or LLM system layers. Secure agent design prevents prompt injections, unauthorized tool execution, and memory poisoning.

## 1. Prompt Injection & Input Hardening
- **Strict User-System Boundaries**: Wrap user inputs inside parameterized schemas. System rules and prompt directions must be injected in dedicated, high-priority context tags that cannot be overwritten by user text.
- **Inbound Content Scrubbing**: Call semantic analysis and pattern classifiers before user text is ingested by the LLM core. Detect and block key prompt injection attacks (e.g. system bypasses, roleplay requests, and jailbreaks) synchronously under 200ms.
- **Output Validation**: Sanitize and scrub LLM-generated output messages before exposing them to the client interface or system execution terminal.

## 2. Cryptographic Ledgers & Tool Access Control
- **Manifest Permissions (RBAC)**: Enforce a "deny-by-default" access policy on all tools. Every agent must register a signed capability manifest defining exactly what tools and operations it is authorized to invoke.
- **RS256 Identity Assertions**: Issue short-lived, cryptographically signed RS256 JSON Web Tokens (JWTs) representing the agent's identity. Verify these signatures at every tool and database gateway.
- **Tamper-Resistant Ledgering**: Log all agent interactions, message analyses, and tool call authorizations sequentially. Link all transaction entries using cryptographically secure SHA-256 hash chains to ensure auditability.
