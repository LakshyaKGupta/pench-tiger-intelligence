# Skill: Security Threat Model

Use this skill when the user explicitly asks to threat model a codebase/path, enumerate threats or abuse paths, or perform AppSec threat modeling.

## 1. Overview
Deliver an actionable, project-grounded threat model that details trust boundaries, assets, attacker capabilities, abuse paths, and mitigations. Anchor every claim to concrete evidence in the repository.

## 2. Workflow

### Step 1: System Model Scope
- Identify primary components, data stores, entry points, and integrations.
- Differentiate runtime behavior from CI/CD, build, and development tooling.
- Map files and directories to architectural components.

### Step 2: Assets, Entry Points & Trust Boundaries
- **Trust Boundaries**: Identify protocols, authentication, validation, encryption, and rate-limiting at interface edges.
- **Assets**: List risk-driving elements (credentials, user data, models, logs, configs).
- **Entry Points**: Catalog APIs, upload forms, parsing logic, and message brokers.

### Step 3: Attacker Calibration & Abuse Paths
- Define realistic attacker goals (exfiltration, elevation, denial of service).
- Classify threats using STRIDE or similar frameworks.
- Map threats to realistic attacker capabilities (e.g., remote unauthenticated, compromised token, local developer).

### Step 4: Prioritization & Mitigation
- Rate threats qualitatively: **Critical**, **High**, **Medium**, **Low**.
- Detail existing controls versus recommended controls.
- Provide actionable implementation hints (e.g., specific schema constraints, token validation logic, row-level database controls) rather than generic checklists.

## 3. Output Format
- Write the threat model to a file named `<repo-or-dir-name>-threat-model.md` at the project root.
- Clearly separate assumptions, scope, threats, and recommendations.
- Target critical abuse paths with high clarity and avoid generic boilerplate.
