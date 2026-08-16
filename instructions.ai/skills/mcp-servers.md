# Skill: MCP Servers — Global Configuration

This skill documents all MCP (Model Context Protocol) servers configured globally on this device, their capabilities, and when to use each. This represents the **Elite Builder Stack** — a highly curated, 100% free, local-only stack of the 12 most powerful developer tools.

## Configured MCP Servers

### 🎭 Playwright (`@playwright/mcp@latest`)
**Purpose**: Browser automation, web testing, and interaction
**Capabilities**:
- Navigate to any URL and take screenshots
- Click, fill forms, submit, interact with DOM
- Test web UIs end-to-end
- Capture network requests
- Execute JavaScript in browser context

**Use when**: Need to automate browser tasks, test web applications, fill forms, or do anything requiring an actual browser.

---

### 🌐 Chrome DevTools (`chrome-devtools-mcp@latest`)
**Purpose**: Chrome browser control, debugging, and inspection
**Capabilities**:
- Navigate Chrome browser
- Inspect DOM elements
- Capture screenshots
- Run performance traces
- Monitor network requests
- Debug JavaScript

**Use when**: Need to debug web pages, inspect layouts, capture visual states, or analyze page performance.

---

### ✨ Aceternity UI (`aceternityui-mcp`)
**Purpose**: Search and discover premium React UI components
**Capabilities**:
- Search Aceternity UI components by name
- Get installation instructions for any component
- List all available components
- Fetch component source code and dependencies

**Use when**: Building React/Next.js UIs that need premium animations, glassmorphism, particle effects, or stunning visuals.

---

### 🎯 Shadcn (`shadcn@latest mcp`)
**Purpose**: Search and install shadcn/ui components
**Capabilities**:
- Search all shadcn components
- Install components via registry
- Access Aceternity, MagicUI, and other registry components
- Get component documentation

**Use when**: Need accessible, composable UI primitives (buttons, dialogs, forms, tables, etc.) or want to access the shadcn registry.

---

## Advanced Development Servers

### 🧠 Sequential Thinking (`@modelcontextprotocol/server-sequential-thinking`)
**Purpose**: Complex problem solving and logical breakdowns
**Capabilities**:
- Structures dynamic thought processes
- Breaks down complex architectural tasks
- Helps the AI step through debugging logically

### 📚 Memory (`@modelcontextprotocol/server-memory`)
**Purpose**: Persistent knowledge graph storage
**Capabilities**:
- Stores entities, relationships, and observations
- Retains context across different sessions
- Useful for remembering project specific rules over time

### 📥 Fetch (`@modelcontextprotocol/server-fetch`)
**Purpose**: Simple web fetching and markdown conversion
**Capabilities**:
- Downloads raw HTML/data from URLs
- Converts content into clean, AI-readable markdown
- Great for pulling in API documentation or schemas

### 💾 SQLite (`mcp-server-sqlite`)
**Purpose**: Direct database interaction
**Capabilities**:
- Executes SQL queries against a local database
- Inspects database schemas
- Manages and edits records locally
- *Default path*: `/Users/lol/Docs/antigravity/Hiring Wallah/backend/hiring_wallah.db`

### 🌳 Git (`@cyanheads/git-mcp-server`)
**Purpose**: Secure local version control
**Capabilities**:
- Read git history, logs, and diffs
- Commit, branch, push, and pull automatically
- Securely manage local repositories

### 🧠 Code Intelligence (`mcp-code-intelligence`)
**Purpose**: Local semantic search across codebase
**Capabilities**:
- Indexes local codebase using SQLite FTS5
- Enables semantic code querying
- Helps the AI understand massive repositories

### 📂 Filesystem (`@modelcontextprotocol/server-filesystem`)
**Purpose**: Raw directory access
**Capabilities**:
- Unrestricted access to specified local directories
- Read/write/navigate outside standard project scope
- *Default allowed path*: `/Users/lol`

### ⏱️ Time (`@guanxiong/mcp-server-time`)
**Purpose**: Chronological logic and timezones
**Capabilities**:
- Check local system time
- Resolve timezone differences
- Enable time-based logic (e.g. "what changed today?")

### 🐳 Docker (`mcp-docker-server`)
**Purpose**: Container infrastructure management
**Capabilities**:
- Start, stop, and inspect Docker containers
- Manage images and volumes
- Run `docker-compose` stacks directly
- Debug failing microservices locally

### 💻 Terminal (`mcp-server-terminal`)
**Purpose**: Long-running process management
**Capabilities**:
- Start background terminal sessions natively
- Keep development servers or watchers alive
- Execute complex build scripts asynchronously

---

## Quick Reference: Which MCP to Use?

| Task | MCP |
|------|-----|
| Automate browser / E2E test | Playwright |
| Debug a web page / Layout | Chrome DevTools |
| Build animated UI | Aceternity UI |
| Build accessible UI | Shadcn |
| Break down complex logical problems | Sequential Thinking |
| Store long-term knowledge & facts | Memory |
| Download & convert web content | Fetch |
| Query a local SQLite database | SQLite |
| Version control (Commit, push) | Git |
| Semantic code search | Code Intelligence |
| Deep file/folder manipulation | Filesystem |
| Timezone / chronological logic | Time |
| Manage containers & compose | Docker |
| Run background scripts/servers | Terminal |
