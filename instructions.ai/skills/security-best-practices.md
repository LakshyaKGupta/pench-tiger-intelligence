# Skill: Security Best Practices

Use this skill when the user explicitly requests security best practices guidance, a security review/report, or secure-by-default coding help for Python, JavaScript/TypeScript, or Go.

## 1. Overview
This skill provides guidance on identifying the language and frameworks in use and reviewing them against security best practices. Use these instructions to write secure-by-default code, passively detect major security issues, or generate structured vulnerability reports.

## 2. Workflow
1. **Identify Languages & Frameworks**: Determine all frontend/backend languages and frameworks (e.g., FastAPI, Express, React, Django).
2. **Apply Security Guidelines**: Ensure code adheres to framework-specific security standards (e.g., input validation, secure auth, CSRF/XSS prevention).
3. **Passive Detection**: Flag critical vulnerabilities during normal development, focusing on high-impact issues.
4. **Active Auditing**: When asked, produce a prioritized security report detailing vulnerabilities and offering remediation steps.

## 3. General Secure Coding Guidelines

### Public Resource Identifiers
Avoid auto-incrementing integer IDs for public-facing resource references. Use globally unique and non-guessable identifiers such as UUIDv4 or secure random hex strings to prevent enumeration attacks.

### Transport Layer Security (TLS) & Cookies
- While TLS is critical for production, local development environments typically operate over plain HTTP.
- **Do not mark the lack of local HTTPS as a vulnerability.**
- Set the `secure` flag on session cookies only if the environment runs over TLS. Enabling `secure` cookies in non-TLS local development will block authentication. Ensure configuration variables allow toggling secure cookies per environment.
- Avoid recommending HSTS (HTTP Strict Transport Security) unless the production routing structure is fully analyzed, as misconfigured HSTS can cause severe user lockout.

## 4. Security Report Format
When generating a security audit report:
- Write it to `security_best_practices_report.md` (or the user-specified location).
- Include a brief **Executive Summary** at the top.
- Organize findings by severity: **Critical**, **High**, **Medium**, **Low**.
- Provide numeric IDs and exact file names with line numbers for all references.
- Focus on high-impact, actionable items first.
