# Skill: Global Scale & Internationalization (i18n)

Use this skill when designing multi-lingual structures, routing localized sites, formatting date/currencies, or building RTL (Right-to-Left) layouts.

## 1. Abstracted Translation Keys
- **No Hardcoded Strings**: Keep all user-facing UI text keys inside dedicated JSON translation catalogs (e.g. `locales/en.json`, `locales/es.json`). Access them via translation hooks:
  - *React/JS*: `t("dashboard.welcome_message")`
  - *Python*: `_("welcome_message")`
- **Dynamic Variable Injection**: Standardize parameter placeholders for translated keys (e.g. `t("user_greeting", { name: "Alex" })`) rather than stitching strings dynamically.

## 2. Spatial RTL & Localized Formatting
- **RTL Fluidity**: When building layout containers, avoid hardcoded direction bounds like `left` or `right`. Leverage logical properties to support both LTR and RTL directions:
  - Prefer: `margin-inline-start`, `padding-inline-end`, `text-align: start`
  - Avoid: `margin-left`, `padding-right`, `text-align: left`
- **Standardized Localized Formats**: Format dates, numbers, timezones, and currencies according to the client locale using standard native parsers (e.g. `Intl.DateTimeFormat` or localized timezone libraries).
