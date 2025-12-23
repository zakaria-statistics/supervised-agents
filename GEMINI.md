# Gemini Project Context

## Project Overview
This is a lightweight Node.js API project designed for practicing DevOps workflows, cloud deployment, and team collaboration. The project simulates a real-world development environment with a small team structure.

**Key Technologies:**
- **Runtime:** Node.js (v20+)
- **Framework:** None (Native `http` module)
- **Testing:** Native `node:test` runner and `node:assert`
- **Dependencies:** None (currently zero-dependency)

## Team Structure & Roles
- **Zack:** DevOps / Cloud Engineer (Lead)
- **Claude:** Developer (Feature implementation)
- **Gemini:** QA / Tester (Code review, testing, bug catching)
- **Codex:** Workflow Manager & Security/Optimization

## Architecture
The application is a simple HTTP server defined in `src/index.js`.
- **Entry Point:** `src/index.js`
- **Port:** Defaults to 3000 (configurable via `PORT` env var)
- **Exports:** The server instance is exported to facilitate testing.

### Endpoints
- `GET /`: Returns API metadata (message, version).
- `GET /health`: Returns status "ok" and an ISO timestamp.

## Building and Running

### Prerequisites
- Node.js (v20 or higher recommended for native test runner support)

### Scripts
| Command | Description |
| :--- | :--- |
| `npm start` | Starts the server in production mode (`node src/index.js`). |
| `npm run dev` | Starts the server in development mode with watch enabled. |
| `npm test` | Runs the test suite using the native Node.js test runner. |

## Development Conventions

### Coding Style
- **Minimalism:** Prefer native Node.js modules over external libraries where possible to keep the footprint light.
- **Testing:** All new features must include tests. Tests are located in `src/*.test.js` files and use the `node:test` module.
- **Server Export:** The `http.Server` instance is exported from the main file. The server only starts listening automatically if the file is run directly (checked via `require.main === module`).

### Workflow
- **Branching:** Feature branches (e.g., `gemini/add-tests`) are used.
- **Communication:** Team updates and handover notes are located in `agents-sync/TEAM_NOTES.md`.
- **Guidelines:** Shared agent guidelines are in `agents-sync/AGENTS.md`.
- **Restricted Access:** Always ask for explicit authorization before modifying any files within the `agents-sync/` directory.
- **Roadmap:** Tracking progress on Dockerization, CI/CD, and Cloud Deployment.
