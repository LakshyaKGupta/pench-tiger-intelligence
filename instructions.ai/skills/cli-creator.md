# Skill: CLI Creator

Use this skill when the user wants to create a durable, custom command-line interface (CLI) tool that integrates with external APIs, processes local data, or wraps existing scripts, designed to run from any repository.

## 1. Runtime Selection
Assess the user's available toolchains (`rustc`, `node`, `python3`, `uv`) and choose the appropriate runtime:
- **Rust**: Default choice for high performance, single-binary distribution, and low startup latency.
- **Node.js / TypeScript**: Best when integrating with existing web-oriented packages, Playwright/browser automation libraries, or NPM SDKs.
- **Python**: Preferred for data parsing (Pandas, SQLite), data science tools, or light wrapper scripts using `uv`.

## 2. Command Surface Design Contract
Every custom CLI must expose a composable, predictable command surface:
- **Help**: `tool-name --help` shows usage and subcommands.
- **Diagnostics**: `tool-name --json doctor` checks config, auth validity, version info, and network connectivity.
- **Discovery**: List accounts, projects, workspaces, or teams.
- **Resolution**: Translate friendly names/slugs into stable UUIDs/hashes so subsequent commands don't have to search.
- **Read**: Fetch specific objects or search collections. Support `--limit` and pagination cursors.
- **Write**: Scoped, non-destructive write commands (e.g. `create`, `update`, `delete`, `upload`). Support a `--dry-run` flag where possible.
- **JSON Policy**: Ensure `--json` returns valid machine-readable JSON structure. Redact credentials and stack traces.
- **Raw Escape Hatch**: Expose a generic `api` or `request` command for raw endpoint access.

## 3. Configuration & Authentication
Prioritize configuration storage in this order:
1. **Environment Variables**: Use standard API key tokens (e.g., `GITHUB_TOKEN`, `STRIPE_API_KEY`).
2. **Config File**: Store credentials inside a local configuration file, such as `~/.config/tool-name/config.toml` or `~/.tool-name/config.toml`.
3. **Escaped Flag**: Support `--api-key` only for testing. Never log flags.
4. **Token Security**: Never print credentials in logs or output.

## 4. Install & Verification
- Compile and install the tool on the system `PATH` (e.g., copy to `~/.local/bin` or link globally using `npm link --global`).
- Smoke-test the CLI from outside the source repository directory (e.g., from `/tmp`) using `command -v tool-name` and `tool-name --json doctor`.
