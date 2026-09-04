---
name: storeel-seedance2-canvas
description: name: storeel-seedance2-canvas
---

---
name: storeel-seedance2-canvas
description: "Low-level StoReel Canvas operations for canvas.storeel.vip: login, browser navigation, opening or creating free-canvas projects, inspecting project canvas data, uploading assets, and preserving project structure. For end-to-end AI video generation, SD2/Seedance2 prompting, task submission, polling, writeback, local archiving, or account rotation, use sd2-video-generation first as the router."
---

# Storeel Seedance2 Canvas

## Overview

Use this skill for low-level StoReel Canvas route operations. For actual SD2/Seedance2 video generation, use `sd2-video-generation` as the orchestrator and this skill only for page-specific canvas details.

## Core Workflow

1. Log in to `https://canvas.storeel.vip/login/`.
2. From the top-right/home navigation, click the create entry.
3. Enter any reasonable project name when the new-project modal appears.
4. Select free canvas mode, not one-click drama mode.
5. Enter or upload script material in the project canvas.
6. Move through the built-in five-step flow:
   - Step 1: input or upload script.
   - Step 2: break down storyboard script and asset library.
   - Step 3: review storyboard and asset prompts, then generate asset images.
   - Step 4: review asset image quality, then generate Seedance2 storyboard prompts.
   - Step 5: generate storyboard videos.
7. Keep Seedance2 calls inside StoReel Canvas unless the user explicitly replaces this channel.

## Login And Canvas Rules

- Use the fixed site URL `https://canvas.storeel.vip/`.
- Use the email provided by the user for the current run.
- Do not hardcode the password into generated files; read it from the current task context or environment.
- After login, default to creating a new free-canvas project unless the user explicitly provides an existing project URL.
- The project page URL pattern is `/canvas/project/<uuid>`.
- The canvas exposes a left text input area, upload controls, a generation history panel, an asset library panel, and the five-step workflow.

## What To Preserve

- Preserve the user's existing project structure and asset roles.
- Keep scene locks, first-frame assets, and Seedance2 prompts separate.
- If a prompt or asset is weak, fix the asset or first frame before retrying video generation.
- Do not treat this skill as a generic browser-login skill for unrelated sites.

## Scripts

- `scripts/open_storeel_canvas.ps1`: preferred wrapper. It runs the browser automation from the skill directory.
- `scripts/open_storeel_canvas.mjs`: implementation script. It logs in, creates a free-canvas project by default, or opens `STOREEL_CANVAS_PROJECT_URL` when that environment variable is set.

## References

- `references/canvas-workflow.md`: page structure, project flow, and operational notes.
