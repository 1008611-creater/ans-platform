# Claude Code Plugin

Access ANS directly in [Claude Code](https://code.claude.com) with our official plugin. Search prompts, discover skills, and improve your prompts without leaving your IDE.

## Installation

Add the ANS marketplace to Claude Code:

```
/plugin marketplace add f/ANS
```

Then install the plugin:

```
/plugin install prompts.chat@prompts.chat
```

## Features

| Feature | Description |
|---------|-------------|
| **MCP Server** | Connect to ANS API for real-time prompt access |
| **Commands** | `/ANS:prompts` and `/ANS:skills` slash commands |
| **Agents** | Prompt Manager and Skill Manager agents for complex workflows |
| **Skills** | Auto-activating skills for prompt and skill discovery |

## Commands

### Search Prompts

```
/ANS:prompts <query>
/ANS:prompts <query> --type IMAGE
/ANS:prompts <query> --category coding
/ANS:prompts <query> --tag productivity
```

**Examples:**
```
/ANS:prompts code review
/ANS:prompts writing assistant --category writing
/ANS:prompts midjourney --type IMAGE
/ANS:prompts react developer --tag coding
```

### Search Skills

```
/ANS:skills <query>
/ANS:skills <query> --category coding
/ANS:skills <query> --tag automation
```

**Examples:**
```
/ANS:skills testing automation
/ANS:skills documentation --category coding
/ANS:skills api integration
```

## MCP Tools

The plugin provides these tools via the ANS MCP server:

### Prompt Tools

| Tool | Description |
|------|-------------|
| `search_prompts` | Search prompts by keyword, category, tag, or type |
| `get_prompt` | Retrieve a prompt with variable substitution |
| `save_prompt` | Save a new prompt (requires API key) |
| `improve_prompt` | Enhance prompts using AI |

### Skill Tools

| Tool | Description |
|------|-------------|
| `search_skills` | Search for Agent Skills |
| `get_skill` | Get a skill with all its files |
| `save_skill` | Create multi-file skills (requires API key) |
| `add_file_to_skill` | Add a file to an existing skill |
| `update_skill_file` | Update a file in a skill |
| `remove_file_from_skill` | Remove a file from a skill |

## Agents

### Prompt Manager

The `prompt-manager` agent helps you:
- Search for prompts across ANS
- Get and fill prompt variables
- Save new prompts to your account
- Improve prompts using AI

### Skill Manager

The `skill-manager` agent helps you:
- Search for Agent Skills
- Get and install skills to your workspace
- Create new skills with multiple files
- Manage skill file contents

## Skills (Auto-Activating)

### Prompt Lookup

Automatically activates when you:
- Ask for prompt templates
- Want to search for prompts
- Need to improve a prompt
- Mention ANS

### Skill Lookup

Automatically activates when you:
- Ask for Agent Skills
- Want to extend Claude's capabilities
- Need to install a skill
- Mention skills for Claude

## Authentication

To save prompts and skills, you need an API key from [ANS/settings](https://ans.cauai.fun/settings).

### Option 1: Environment Variable

Set the `PROMPTS_API_KEY` environment variable:

```bash
export PROMPTS_API_KEY=your_api_key_here
```

### Option 2: MCP Header

Add the header when connecting to the MCP server:

```
PROMPTS_API_KEY: your_api_key_here
```

## Plugin Structure

```
plugins/claude/ANS/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── .mcp.json                 # MCP server configuration
├── commands/
│   ├── prompts.md           # /ANS:prompts command
│   └── skills.md            # /ANS:skills command
├── agents/
│   ├── prompt-manager.md    # Prompt management agent
│   └── skill-manager.md     # Skill management agent
└── skills/
    ├── prompt-lookup/
    │   └── SKILL.md         # Prompt discovery skill
    └── skill-lookup/
        └── SKILL.md         # Skill discovery skill
```

## Links

- **[ANS](https://ans.cauai.fun)** - Browse all prompts and skills
- **[API Documentation](https://ans.cauai.fun/api/mcp)** - MCP server endpoint
- **[Settings](https://ans.cauai.fun/settings)** - Get your API key
