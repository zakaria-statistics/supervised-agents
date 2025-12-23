# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Run the server (port 3000 by default)
npm run dev        # Run with auto-reload (node --watch)
npm test           # Run tests using Node.js native test runner
```

## Architecture

Simple Node.js HTTP server with no dependencies. The server exports its instance for testing.

- `src/index.js` - HTTP server with JSON API endpoints (`/`, `/health`)
- `src/index.test.js` - Tests using `node:test` and `node:assert`

The server only starts listening when run directly (`require.main === module`), allowing it to be imported for testing without auto-starting.

## Coding Rules

**Always add comments to explain configurations**, including:
- Ports (why this port, what it's used for)
- Database drivers/connections (connection strings, pooling, timeouts)
- Environment variables (what they control, default values, valid options)
- Docker/container settings (exposed ports, volumes, networks)
- CI/CD configurations (what each step does, why it's needed)
- Any infrastructure or DevOps related config

This project is for learning DevOps - clarity over brevity.

## Team Collaboration

- **Zack** - DevOps / Cloud (Lead)
- **Claude** - Developer
- **Gemini** - QA / Tester
- **Codex** - Workflow / Security

**Sync files location:** `agents-sync/`
- `agents-sync/AGENTS.md` - Shared repo guidelines for all agents
- `agents-sync/TEAM_NOTES.md` - Async communication and handover notes

Always check these files before starting work to stay synced with the team.

**IMPORTANT:** Always ask Zack for authorization before modifying any files in `agents-sync/`.
