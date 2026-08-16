# Skill: Playwright CLI Automation

Use this skill when you need to automate browser navigation, form filling, HTML snapshots, visual screenshots, or browser-based data extraction directly from the command line.

## 1. Prerequisites & Installation
Before executing Playwright CLI commands, verify if `npx` is available:
```bash
command -v npx >/dev/null 2>&1
```
If missing, suggest the user install Node.js/npm and run:
```bash
npm install -g @playwright/cli@latest
playwright-cli --help
```

## 2. CLI Execution Workflow
Playwright CLI utilizes structural snapshot references to perform interactions:
1. **Open Viewport**: `playwright-cli open https://example.com --headed`
2. **Snapshot**: Capture the DOM tree structure to generate element reference IDs (e.g. `e1`, `e2`).
3. **Interact**: Click, fill, or press keys on target references:
   - `playwright-cli click e1`
   - `playwright-cli fill e2 "text"`
4. **Re-Snapshot**: Call `snapshot` again after any state change, menu click, page load, or modal toggle to refresh stale element IDs.

## 3. Command Examples

### Form Filling & Submission
```bash
playwright-cli open https://example.com/login
# Take snapshot to locate elements
playwright-cli snapshot
playwright-cli fill e1 "user@example.com"
playwright-cli fill e2 "securepassword"
playwright-cli click e3
# Refresh state
playwright-cli snapshot
```

### Multi-Tab Actions
```bash
playwright-cli tab-new https://example.com
playwright-cli tab-list
playwright-cli tab-select 0
playwright-cli snapshot
```

### Visual Captures
- **Screenshot**: `playwright-cli screenshot`
- **PDF Export**: `playwright-cli pdf`
