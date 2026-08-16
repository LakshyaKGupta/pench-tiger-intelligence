# Skill: Migrate to Codex

Use this skill when migrating instructions, custom skills/commands, subagents, and MCP configurations from other AI coding environments (e.g. Claude Code) into a Codex project or global configuration directory.

## 1. Overview
Align instructions, settings, and plugins with Codex configuration structures. Automatically perform migrations, inspect reports, validate generated files, and resolve migration warnings.

## 2. File Mappings

| Source Surface | Codex Target |
|----------------|--------------|
| `CLAUDE.md` / `AGENTS.md` | `AGENTS.md` |
| `.claude/commands` | Codex Skills (under `.agents/skills/` or `~/.codex/skills/`) |
| `.claude/agents` | Codex Subagents (under `.codex/agents/` or `~/.codex/agents/`) |
| `.mcp.json` / MCP config | `.codex/config.toml` (inside `[mcp]` tables) |
| `.claude/settings.json` hooks | `.codex/hooks.json` |

## 3. Migration Workflow
1. **Analyze Source**: Scan the source files (e.g. `.claude/`) using `--scan-only` or `--plan`.
2. **Execute Dry Run**: Validate schema alignment and expected output layout using `--dry-run`.
3. **Write Target**: Apply changes. Preserve unrelated configurations in `config.toml` (e.g. telemetry, notification, other MCP profiles).
4. **Fix Warnings**: Scan generated outputs for `# MANUAL MIGRATION REQUIRED` markers or validation failures and resolve them.
5. **Run Validation**: Run targeted target-validation checks using the migrator's validation tools (e.g. `--validate-target`).
