# AGENTS.md

## Cursor Cloud specific instructions

### Repository overview

This is a **content-only repository** — an Obsidian vault containing ~1,539 Markdown files with structured financial data (financial statements) from major Polish public companies. There is no application code, no build system, no test framework, and no services to run.

### Structure

- `vault/00-MOC/` — Maps of Content (root navigation notes)
- `vault/10-Koncepty/` — Cross-company financial concepts
- `vault/20-Firmy/` — Company-specific financial tables (7 companies: Enea, KGHM, ORLEN, PGE, PKO Bank Polski, PZU, TAURON)
- `open-mercato-patches/` — Exported git patch for the separate `open-mercato/open-mercato` project

### Development workflow

Since this is a content repo, "development" means adding/editing Markdown files that follow the vault conventions:

- Files use YAML frontmatter with `type`, `tags`, and domain-specific keys
- Inter-file linking uses Obsidian `[[wiki-links]]`
- Financial tables use standard Markdown table syntax

### Linting

```bash
markdownlint vault/
```

This checks Markdown formatting. The vault has existing style violations (missing blank lines around headings/lists, trailing punctuation) that are part of the content convention — not bugs.

### No build, test, or run commands

There is no application to build or run. The `vault/` directory is opened directly in Obsidian (or any Markdown editor).

### Wiki-link integrity

To check that wiki-links resolve to existing files:

```bash
rg -o '\[\[([^\]|]+)' --no-filename vault/ | sed 's/\[\[//' | sort -u > /tmp/links.txt
# Then verify each link target has a corresponding .md file in the vault
```

As of the current state, 98.2% of wiki-links resolve correctly (1512/1539).
