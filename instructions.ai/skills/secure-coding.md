# Skill: Secure Coding & Threat Modeling

Use this skill to identify structural vulnerabilities, safeguard sensitive application data, and defend system endpoints against malicious exploitation.

## 1. Input Sanitization & Attack Mitigation
- **Sanitize All Entrances**: Never trust user-supplied inputs. Enforce parameterized inputs or structured object parsing (e.g. prepared SQL queries) to prevent SQL Injection.
- **XSS & CSRF Mitigation**: Escape all dynamically-rendered HTML fields on the client-side. Enforce strict CSRF tokens on any state-changing state POST/PUT API mutations.
- **Prompt Injection Defense**: When sending payloads to LLM cores, strictly isolate user content inside parameterized schema boundaries. Avoid appending raw user queries into system context.

## 2. Cryptographic & Key Safety
- **Strict Key Separation**: Never hardcode API keys, database credentials, or secret tokens inside code. Always pull them from environmental variables.
- **Standard Hashing**: Store all user passwords using advanced password-hashing algorithms (like bcrypt or Argon2) with strong salting configurations.
- **Verified Signatures**: Use cryptographically signed tokens (like RS256 JWTs) for identity assertions. Always verify signature chains and expiration metadata at every endpoint entrance.
- **Least Privilege Access**: Constrain system-level process rights, database write access, and execution tokens to the minimum required capability to complete the task.
