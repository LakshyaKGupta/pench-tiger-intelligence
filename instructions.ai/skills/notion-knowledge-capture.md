# Skill: Notion Knowledge Capture

Use this skill when capturing chats, technical notes, decisions, FAQs, or wiki details into structured, linkable Notion pages.

## 1. Overview
Converts conversational context and notes into structured Notion database records, ensuring team accessibility and wiki linking.

## 2. Notion MCP Connection Preflight
If any Notion command fails due to connection issues, guide the user to:
1. **Register MCP**: `codex mcp add notion --url https://mcp.notion.com/mcp`
2. **Enable Remote Client**: Run `codex --enable rmcp_client` or set `[features].rmcp_client = true` in `config.toml`.
3. **Authenticate**: Run `codex mcp login notion`.
4. **Restart**: Instruct the user to restart Codex after login.

## 3. Workflow
1. **Define Content Type**: Identify if the note is a decision, FAQ, how-to, wiki page, or reference documentation.
2. **Find Destination Database**: Locate the correct team database (e.g. wiki, how-to guides, FAQ logs) using `Notion:notion-search`.
3. **Extract Content**:
   - For **decisions**: record options considered, rationale, and chosen path.
   - For **how-tos**: write bulleted steps, dependencies, environment constraints, and code snippets.
   - For **FAQs**: phrase as Q&A blocks linking to deeper pages.
4. **Publish**: Create the page using `Notion:notion-create-pages`, ensuring tags, owners, and dates are set.
5. **Backlink**: Insert bidirectional references on index pages or parent documents.
