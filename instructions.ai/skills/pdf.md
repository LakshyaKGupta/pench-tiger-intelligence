# Skill: PDF Processing & Creation

Use this skill when tasks require generating, reading, parsing, or reviewing PDF files where layout rendering and typography matter.

## 1. Overview
Ensure high-fidelity layout execution when working with PDF documents. Prefer visual QA by rendering PDF pages to images for inspection, and use structured libraries for generation and text parsing.

## 2. Tools & Dependencies
Install missing tools depending on the OS environment:
- **System Rendering Tool (Poppler)**:
  - macOS: `brew install poppler`
  - Debian/Ubuntu: `sudo apt-get install -y poppler-utils`
- **Python Libraries**:
  - `reportlab` (for programmatic document generation)
  - `pdfplumber` / `pypdf` (for parsing and text extraction)
  - Command: `uv pip install reportlab pdfplumber pypdf` (or fallback to `pip`)

## 3. Workflow Guidelines

### Rendering for Review
Convert pages to PNG format for visual validation:
```bash
pdftoppm -png -r 150 input.pdf /tmp/page_preview
```
Review the resulting `/tmp/page_preview-*.png` files using image viewers to check layout and formatting before final delivery.

### Document Generation (ReportLab)
- Define margins (e.g. 0.75 in / 54 pt) and keep layouts responsive to page size bounds.
- Use flowables (`Paragraph`, `Spacer`, `Table`, `Image`) rather than absolute canvas coordinates to prevent text clipping and overlapping.
- Handle tables carefully: specify column widths explicitly and wrap cell content inside `Paragraph` objects to ensure auto-wrapping.

### Design Standards & Quality Gates
- **Zero Truncation**: No clipped labels, overlapping lines, or text overflowing onto blank pages.
- **Typography Consistency**: Maintain clear heading hierarchies, line spacing, and readable font sizes.
- **ASCII Dash Standard**: Avoid non-standard Unicode dashes (like U+2011) that might fail rendering on basic viewers; use standard ASCII hyphens instead.
- **Clean Up**: Store temporary files under `tmp/` and clean them up after verification.
