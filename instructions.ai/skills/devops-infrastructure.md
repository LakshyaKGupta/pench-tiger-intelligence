# Skill: Cloud-Native DevOps & Containerization

Use this skill when designing Docker containers, writing infrastructure configurations, configuring reverse proxies, or deploying cloud systems.

## 1. High-Performance Containerization
- **Multi-Stage Builds**: Always write multi-stage Dockerfiles to keep production image sizes tiny (separating compile dependencies from execution runtimes).
- **Non-Root Security**: Never run containers as `root`. Define a dedicated non-root user (`USER node` or `USER app`) to prevent container-breakout security threats.
- **Alpine & Minimal Runtimes**: Standardize on lightweight base layers (e.g. `node:20-alpine`, `python:3.11-slim`) to accelerate download speeds and minimize vulnerable packages.

## 2. Reverse Proxies & SSL Hardening
- **Nginx Reverse Proxies**: Configure clean reverse proxies to handle load balancing, proxy buffering, rate-limiting, and compression (gzip/brotli).
- **SSL/TLS Hardening**: Enforce HTTPS using Certbot for automatically renewed Let's Encrypt certificates. Configure modern TLS protocols (TLS v1.2, TLS v1.3) and strong cipher suites.
