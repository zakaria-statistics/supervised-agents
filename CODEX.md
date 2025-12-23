# Repository Guidelines

## Team Roles & Workflow
- Zack leads DevOps and cloud practices and steers deployment and infrastructure decisions.
- Claude focuses on feature development and code implementation.
- Gemini owns QA, test strategy, and regression checks.
- Collaborate early on changes that affect CI/CD, test coverage, or API contracts.
- Codex acts as workflow manager, proposing features, performance improvements, security hardening, and best-practice adoption for the team.

## Shared Rules (All Agents)
- Add comments that explain configurations: ports, env vars, Docker settings, CI/CD steps, or infra-related values.
- Prefer native Node.js modules over external libraries to keep the footprint minimal.
- All new features should include tests in `src/*.test.js`.
- The server should export its `http.Server` instance and only listen when run directly.
- Use `agents-sync/TEAM_NOTES.md` for async updates and handoffs.

## Agent Sync References
- Contributor guide: `agents-sync/AGENTS.md`.
- Team sync log: `agents-sync/TEAM_NOTES.md`.

## Authorization Note
- Always ask for authorization before making changes in `agents-sync/`.

## Project Structure & Module Organization
- `src/index.js` contains the HTTP server and route handling for `/` and `/health`.
- `src/index.test.js` holds integration-style tests for the API.
- Root files like `README.md` and `TEAM_NOTES.md` track project overview and team coordination.

## Build, Test, and Development Commands
- `npm start` runs the API server with Node (default `http://localhost:3000`).
- `npm run dev` runs the server in watch mode for local development.
- `npm test` runs the Node.js test runner (`node --test`).

## Coding Style & Naming Conventions
- Use CommonJS modules (`require`, `module.exports`).
- Indentation: 2 spaces; keep lines concise and readable.
- Constants use `UPPER_SNAKE_CASE` (e.g., `PORT`, `BASE_URL`).
- Routes should stay small and explicit; prefer early returns for clarity.

## Testing Guidelines
- Tests use `node:test` with `node:assert` and live HTTP calls.
- Name test files with `.test.js` and keep them in `src/`.
- Cover success and error paths (e.g., `/unknown` returns 404).
- Ensure servers opened in tests are closed with `t.after()`.

## Commit & Pull Request Guidelines
- Prefer conventional prefixes seen in history: `docs:`, `chore:`, `test:`, `feat:`, `fix:`.
- Write short, imperative summaries (e.g., `docs: update API section`).
- PRs should include a brief summary, test results, and any API behavior changes.
- If you change routes or responses, update `README.md` accordingly.

## Configuration & Runtime Notes
- `PORT` is configurable via environment variables; default is `3000`.
- Keep responses JSON-only and include `Content-Type: application/json`.
