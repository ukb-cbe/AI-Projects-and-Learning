# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a personal portfolio and learning repository for AI projects built with no-code/low-code tools and AI assistance (Claude AI, ChatGPT, Voiceflow, Flowise, Replit). It does not follow a single language or framework — each project under its subdirectory may use different stacks.

## Planned Structure

```
learning-path/    # Notes and learning journey documentation
ai-agents/        # Conversational AI and automation agents
web-apps/         # Interactive AI web applications
automation/       # AI-powered workflow automations
demos/            # Screenshots and demo videos
```

## Working in This Repo

Since projects vary by technology, check each project's own directory for a local README or package file before assuming any build/run commands. Common patterns to look for:

- `package.json` → Node.js/JS project: use `npm install` and `npm start` / `npm test`
- `requirements.txt` or `pyproject.toml` → Python project: use `pip install -r requirements.txt` or `uv sync`
- `*.ipynb` → Jupyter notebook: run with `jupyter notebook` or open in VS Code

## Notes

- Projects are built using no-code and AI-assisted approaches; generated code may not follow conventional patterns.
- Each subdirectory is an independent project — there is no shared build system at the repo root.
