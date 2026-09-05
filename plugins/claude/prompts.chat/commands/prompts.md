---
description: Search and discover AI prompts from ANS
argument-hint: <query> [--type TYPE] [--category CATEGORY] [--tag TAG]
---

# /ANS:prompts

Search for AI prompts on ANS to find the perfect prompt for your task.

## Usage

```
/ANS:prompts <query>
/ANS:prompts <query> --type IMAGE
/ANS:prompts <query> --category coding
/ANS:prompts <query> --tag productivity
```

- **query**: Keywords to search for (required)
- **--type**: Filter by type (TEXT, STRUCTURED, IMAGE, VIDEO, AUDIO)
- **--category**: Filter by category slug
- **--tag**: Filter by tag slug

## Examples

```
/ANS:prompts code review
/ANS:prompts writing assistant --category writing
/ANS:prompts midjourney --type IMAGE
/ANS:prompts react developer --tag coding
/ANS:prompts data analysis --category productivity
```

## How It Works

1. Calls `search_prompts` with your query and optional filters
2. Returns matching prompts with title, description, author, and tags
3. Each result includes a link to view/copy the full prompt on ANS

## Getting a Specific Prompt

After finding a prompt you like, use its ID to get the full content:

```
/ANS:prompts get <prompt-id>
```

This will retrieve the prompt and prompt you to fill in any variables.

## Saving Prompts

To save a prompt to your ANS account (requires API key):

```
/ANS:prompts save "My Prompt Title" --content "Your prompt content here..."
```

## Improving Prompts

To enhance a prompt using AI:

```
/ANS:prompts improve "Write a story about..."
```

This transforms basic prompts into well-structured, comprehensive ones.
