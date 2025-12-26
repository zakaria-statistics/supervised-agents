# App Features Roadmap for DevOps Practice

Based on `devops-cloud.md` reference. Features needed in our Node.js app to practice the full DevOps lifecycle.

---

## Observability Endpoints

Required for Prometheus, Grafana, and alerting practice.

### `/metrics` - Prometheus Metrics
```
http_requests_total{method, path, status}
http_request_duration_seconds{method, path}
nodejs_heap_size_bytes
nodejs_active_handles
app_info{version, node_version, environment}
```

### `/health` - Liveness Probe
- Returns 200 if process is alive
- Used by K8s `livenessProbe`
- Simple check, no dependencies

### `/ready` - Readiness Probe
- Returns 200 when ready to accept traffic
- Checks dependencies (DB, Redis if added)
- Used by K8s `readinessProbe`

### `/info` - Build Metadata
```json
{
  "version": "1.0.0",
  "commit": "abc123",
  "buildTime": "2024-01-15T10:30:00Z",
  "environment": "production"
}
```

---

## Environments: Dev, Stage, Prod

Required for practicing environment-specific configs, deployment pipelines, and promotion workflows.

### Environment Characteristics

| Aspect | Dev | Stage | Prod |
|--------|-----|-------|------|
| Purpose | Local development | Pre-prod testing | Live traffic |
| Data | Mock/seed data | Sanitized prod copy | Real data |
| Scale | Single instance | Minimal replicas | Auto-scaled |
| Logging | Text, debug level | JSON, info level | JSON, warn level |
| Secrets | Local .env file | K8s secrets | K8s secrets + vault |
| Domain | localhost:3000 | stage.app.com | app.com |
| DB | SQLite/local PG | Shared PG | RDS Multi-AZ |
| Monitoring | Optional | Full stack | Full stack + alerts |

### Environment-Specific Configs

```
# Dev
NODE_ENV=development
LOG_LEVEL=debug
LOG_FORMAT=text
CHAOS_ENABLED=true

# Stage
NODE_ENV=staging
LOG_LEVEL=info
LOG_FORMAT=json
CHAOS_ENABLED=true

# Prod
NODE_ENV=production
LOG_LEVEL=warn
LOG_FORMAT=json
CHAOS_ENABLED=false
```

### Deployment Flow

```
feature branch → dev (local)
       ↓
    PR merge → stage (auto-deploy)
       ↓
   approval → prod (manual trigger or auto)
```

### What Each Environment Practices

| Environment | DevOps Concepts |
|-------------|-----------------|
| Dev | Docker Compose, local debugging, hot reload |
| Stage | CI/CD pipelines, integration tests, smoke tests |
| Prod | Blue-green deploy, HPA, monitoring, alerting |

### File Structure for Environments

```
├── docker-compose.yml          # Dev stack
├── docker-compose.stage.yml    # Stage overrides
├── k8s/
│   ├── base/                   # Shared K8s manifests
│   ├── overlays/
│   │   ├── dev/               # Dev kustomization
│   │   ├── stage/             # Stage kustomization
│   │   └── prod/              # Prod kustomization
├── .env.example                # Template
├── .env.dev                    # Dev defaults (committed)
├── .env.stage                  # Stage defaults (committed)
└── .env.prod                   # Prod template (secrets excluded)
```

---

## Configuration via Environment

Required for K8s ConfigMaps, secrets, and 12-factor app practice.

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment name | development |
| `LOG_LEVEL` | Logging verbosity | info |
| `LOG_FORMAT` | json or text | text |
| `APP_VERSION` | Injected at build | unknown |
| `GIT_COMMIT` | Injected at build | unknown |
| `SHUTDOWN_TIMEOUT_MS` | Graceful shutdown | 10000 |

---

## Structured Logging

Required for ELK/Loki log aggregation practice.

### JSON Log Format
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Request completed",
  "requestId": "uuid-here",
  "method": "GET",
  "path": "/health",
  "statusCode": 200,
  "duration": 5
}
```

### Features
- Request ID for tracing (X-Request-ID header)
- Configurable log level via env
- JSON format for production, text for dev

---

## Graceful Shutdown

Required for K8s rolling deployments and zero-downtime deploys.

### Behavior
1. Receive SIGTERM
2. Stop accepting new connections
3. Wait for in-flight requests (configurable timeout)
4. Close server
5. Exit 0

### Why It Matters
- K8s sends SIGTERM before killing pod
- ALB/Ingress needs time to remove pod from rotation
- Prevents dropped connections during deploys

---

## Container Support

### Dockerfile Requirements
- Multi-stage build (build vs runtime)
- Non-root user (UID 1000)
- HEALTHCHECK instruction
- Proper signal handling (exec form CMD)
- Minimal image (node:alpine or distroless)

### Labels
```dockerfile
LABEL org.opencontainers.image.source="https://github.com/..."
LABEL org.opencontainers.image.version="${APP_VERSION}"
LABEL org.opencontainers.image.revision="${GIT_COMMIT}"
```

---

## Future: Database Integration (Optional)

For practicing RDS, connection pooling, and DB metrics.

### PostgreSQL
- Connection via `DATABASE_URL` env
- Connection pool metrics exposed
- Health check includes DB ping
- Migration scripts support

### Redis (Optional)
- Connection via `REDIS_URL` env
- Used for session/cache
- Health check includes Redis ping

---

## Future: Chaos Engineering (Dev Only)

For practicing resilience and incident response.

### `/chaos/latency` - Add Artificial Delay
```
POST /chaos/latency?ms=500
```

### `/chaos/error` - Force Error Responses
```
POST /chaos/error?rate=0.1&status=500
```

### `/chaos/memory` - Memory Pressure
```
POST /chaos/memory?mb=100
```

Only enabled when `CHAOS_ENABLED=true`.

---

## Implementation Priority

### Phase 1: Core Observability (Start Here)
1. `/metrics` - Prometheus endpoint
2. `/ready` - Readiness probe
3. `/info` - Build metadata
4. Structured JSON logging
5. Environment config

### Phase 2: Container Ready
6. Dockerfile (multi-stage, non-root)
7. Graceful shutdown (SIGTERM handling)
8. docker-compose.yml (app + Prometheus + Grafana)

### Phase 3: CI/CD
9. GitHub Actions workflow
10. Image build and push to GHCR
11. Automated tests on PR

### Phase 4: Kubernetes
12. K8s manifests (Deployment, Service, Ingress)
13. ConfigMap and Secrets
14. HPA for autoscaling

### Phase 5: Advanced
15. Database integration
16. Chaos endpoints
17. Distributed tracing (OpenTelemetry)

---

## Mapping to devops-cloud.md Reference

| Reference Section | App Feature Needed |
|-------------------|-------------------|
| Terraform ALB health check | `/health`, `/ready` endpoints |
| K8s Deployment probes | `/health`, `/ready` endpoints |
| Prometheus scrape config | `/metrics` endpoint |
| GitHub Actions CI | Tests, lint, build scripts |
| Docker Compose stack | Dockerfile, env config |
| Alert rules (error rate, latency) | Metrics with labels |
| Kubernetes HPA | Metrics for CPU/memory |
| ELK/Logstash | JSON structured logs |
| Blue-Green deployment | Graceful shutdown |
| Pod security context | Non-root Dockerfile |
