---
description: Search and discover Agent Skills from ANS
argument-hint: <query> [--category CATEGORY] [--tag TAG]
---

# /ANS:skills

Search for Agent Skills on ANS to extend Claude's capabilities.

## Usage

```
/ANS:skills <query>
/ANS:skills <query> --category coding
/ANS:skills <query> --tag automation
```

- **query**: Keywords to search for (required)
- **--category**: Filter by category slug
- **--tag**: Filter by tag slug

## Examples

```
/ANS:skills code review
/ANS:skills documentation --category coding
/ANS:skills testing --tag automation
/ANS:skills api integration
/ANS:skills data analysis
```

## How It Works

1. Calls `search_skills` with your query and optional filters
2. Returns matching skills with title, description, author, files, and tags
3. Each result includes a link to view the skill on ANS

## Getting a Specific Skill

After finding a skill you want, use its ID to get all files:

```
/ANS:skills get <skill-id>
```

This retrieves the skill with all its files (SKILL.md, reference docs, scripts, etc.)

## Installing a Skill

To download and install a skill to your workspace:

```
/ANS:skills install <skill-id>
```

This saves the skill files to `.claude/ANS:skills/{slug}/` structure.

## Creating a Skill

To create a new skill on ANS (requires API key):

```
/ANS:skills create "My Skill Title" --description "What this skill does"
```

You'll be prompted to provide the SKILL.md content and any additional files.

## Skill Structure

Skills can contain multiple files:
- **SKILL.md** (required) - Main instructions with frontmatter
- **Reference docs** - Additional documentation
- **Scripts** - Helper scripts (Python, shell, etc.)
- **Config files** - JSON, YAML configurations
