# Skill: Sentry Observability

Use this skill when the user asks to inspect Sentry issues/events, retrieve production errors, check application health via Sentry, or write custom Sentry queries.

## 1. Prerequisites & CLI Installation
If Sentry CLI is not set up on the host:
1. **Install CLI**: `curl https://cli.sentry.dev/install -fsS | bash`
2. **Authenticate**: Ask the user to run `sentry auth login` or set `SENTRY_AUTH_TOKEN` locally. **Do not paste keys in chat.**
3. **Confirm Authentication**: `sentry auth status`

## 2. Command Reference

### List Unresolved Production Issues (24h)
```bash
sentry issue list \
  --query "is:unresolved environment:production" \
  --period 24h \
  --limit 20 \
  --json --fields shortId,title,priority,level,status
```

### Inspect Specific Issue (using Short ID)
```bash
sentry issue view {SHORT-ID} --json
```

### Trace Events for an Issue
```bash
sentry issue events {SHORT-ID} --limit 20 --json
```

### AI-Powered Root Cause Explanation
```bash
sentry issue explain {SHORT-ID}
```

### AI-Powered Fix Planner
```bash
sentry issue plan {SHORT-ID}
```

### Arbitrary API Access Fallback
```bash
sentry api /api/0/organizations/{org_slug}/ --method GET
```

## 3. Formatting Standards
- **Issue Summary**: Display title, Short ID, status, counts, first/last seen, and tag frequencies.
- **Redaction**: Redact PII (e.g. user emails, server IPs, API keys) from raw logs before presenting.
- **Errors**: Report lack of CLI authentication clearly and provide local setup commands.
