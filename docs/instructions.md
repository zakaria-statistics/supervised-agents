# App Instructions & Execution Timeline

## Quick Start

```bash
# 1. Run the server
npm start

# 2. Test endpoints
curl http://localhost:3000/
curl http://localhost:3000/health

# 3. Run tests
npm test
```

## Components

```
┌─────────────────────────────────────────────────────┐
│                    src/index.js                     │
│                   (HTTP Server)                     │
├─────────────────────────────────────────────────────┤
│  Dependencies: node:http (built-in)                 │
│  Env: PORT (default: 3000)                          │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                    Endpoints                        │
├─────────────────────────────────────────────────────┤
│  GET /        → { message, version }                │
│  GET /health  → { status, timestamp }               │
│  *            → { error: "Not found" } (404)        │
└─────────────────────────────────────────────────────┘
```

## Execution Timeline

```
┌──────────────────────────────────────────────────────────────────┐
│ STARTUP                                                          │
├──────────────────────────────────────────────────────────────────┤
│ 1. Load http module (node:http)                                  │
│ 2. Read PORT from env (fallback: 3000)                           │
│ 3. Create HTTP server with request handler                       │
│ 4. If run directly (not imported): start listening               │
│ 5. Log: "Server running on port {PORT}"                          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ REQUEST HANDLING                                                 │
├──────────────────────────────────────────────────────────────────┤
│ 1. Set Content-Type: application/json                            │
│ 2. Match route:                                                  │
│    ├─ GET /       → return API info                              │
│    ├─ GET /health → return status + timestamp                    │
│    └─ else        → return 404                                   │
│ 3. Send JSON response                                            │
└──────────────────────────────────────────────────────────────────┘
```

## Dependency Graph

```
src/index.js
    │
    ├── node:http (built-in, no install needed)
    │
    └── Exports: server instance (for testing)
            │
            └── src/index.test.js
                    │
                    ├── node:test (built-in)
                    └── node:assert (built-in)
```

## Test Execution

```
┌──────────────────────────────────────────────────────────────────┐
│ npm test                                                         │
├──────────────────────────────────────────────────────────────────┤
│ 1. Import server from src/index.js (does NOT auto-start)         │
│ 2. Start server on port 3000                                     │
│ 3. Run test cases:                                               │
│    ├─ Test GET / response                                        │
│    ├─ Test GET /health response                                  │
│    └─ Test 404 for unknown routes                                │
│ 4. Shutdown server (t.after hook)                                │
└──────────────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Default | Description        |
|----------|---------|-------------------|
| PORT     | 3000    | Server listen port |
