# Skill: Notion Spec to Implementation

Use this skill when converting product requirement documents (PRDs), design specifications, or feature briefs on Notion into code-level implementation plans and task tickets.

## 1. Overview
Translate feature requirements into concrete task structures in Notion task trackers, linking feature specifications to execution phases.

## 2. Workflow

### Step 1: Spec Parsing
- Locate and fetch the spec using `Notion:notion-search` and `Notion:notion-fetch`.
- Scrutinize the spec for user flows, metrics requirements, system interactions, and edge cases.
- Call out ambiguities or assumptions in a clarifications list.

### Step 2: Implementation Plan Creation
- Choose the plan scope: a quick readout for small edits, or a standard multi-phase plan for larger migrations.
- Create a linked Implementation Plan page in Notion outlining design choices, migration steps, and rollback strategies.

### Step 3: Task Breakdown
- Find the active task database.
- Break down components into 1-2 day executable chunks.
- For each task, document: context, concrete objective, acceptance criteria, and specific block dependencies.
- Create task pages using `Notion:notion-create-pages`, setting relations to the main spec and plan page.

### Step 4: Tracking & Milestones
- Keep checklists and task status attributes synchronized as execution proceeds.
- Log blockers and technical pivots on the parent plan page.
