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

## DevOps & Cloud Focus

This project prioritizes DevOps/Cloud learning over application features. The app serves as a target for practicing the full DevOps lifecycle: build, test, deploy, monitor, and operate.

**Goal:** Cover most real-world DevOps phases and use cases. Features should enable practicing CI/CD, containerization, orchestration, observability, and cloud deployment patterns.

### Required Endpoints & Features

When developing features, prioritize DevOps-oriented functionality:

- **`/metrics`** - Prometheus-compatible metrics endpoint (request counts, latencies, error rates)
- **`/health`** - Health check for container orchestration (Kubernetes liveness/readiness probes)
- **`/ready`** - Readiness probe (separate from health for graceful startup)
- **`/info`** - Build info, version, environment metadata

### Infrastructure Resources to Practice

- **Prometheus** - Metrics collection and alerting
- **Grafana** - Dashboards and visualization
- **Docker** - Containerization
- **Kubernetes** - Orchestration (deployments, services, ingress)
- **CI/CD** - GitHub Actions, automated testing, deployments
- **Logging** - Structured JSON logs for log aggregation (ELK, Loki)
- **Tracing** - OpenTelemetry for distributed tracing

### Development Guidelines

- Keep the app simple - complexity should be in the infrastructure, not the code
- Every new feature should have a DevOps use case (monitoring, scaling, deploying)
- Prefer cloud-native patterns (12-factor app, stateless design, config via env vars)

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
