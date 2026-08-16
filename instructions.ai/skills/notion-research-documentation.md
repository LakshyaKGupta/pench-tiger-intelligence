# Skill: Notion Research & Documentation

Use this skill when researching technical, operational, or business content across multiple Notion sources and synthesizing them into briefs, comparisons, or reports.

## 1. Overview
Retrieve relevant historical documentation, technical notes, or business guidelines from Notion databases, structure comparisons or summaries, and publish unified documentation.

## 2. Workflow

### Step 1: Source Discovery
- Search Notion using specific, narrow search terms (`Notion:notion-search`).
- Fetch candidates (`Notion:notion-fetch`) and build an inventory of facts, metrics, and claims.
- Track source page IDs/URLs for precise citations.

### Step 2: Format Selection
Choose the format suited to the task:
- **Quick Brief**: Concise, 1-page summary of a current topic/readout.
- **Research Summary**: Focused overview of a single technical decision or event.
- **Comparison**: Structured analysis comparing trade-offs of multiple technical directions.
- **Comprehensive Report**: Exec-ready deep dive covering architecture, metrics, and recommendations.

### Step 3: Synthesis & Creation
- Group findings by topic headers and explicitly cite source links.
- Create the summary document using `Notion:notion-create-pages`, ensuring inline citations back to source pages are correct.
- List outstanding questions or follow-up tasks separately.
