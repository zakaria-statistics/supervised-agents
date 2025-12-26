# Pipeline Mapping

## 3 Pipelines, 3 Purposes

| Pipeline | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Every push, every PR | **TEST** only (lint, unit, integration, security) |
| `deploy-stage.yml` | Merge to `develop` | **BUILD + DEPLOY** to staging |
| `deploy-prod.yml` | Merge to `main` | **BUILD + DEPLOY** to production |

## Simple Rule

```
ci.yml           = TEST    (runs everywhere, deploys nowhere)
deploy-stage.yml = BUILD + DEPLOY to staging  (only on develop)
deploy-prod.yml  = BUILD + DEPLOY to prod     (only on main)
```

## Complete Trigger Matrix

### 1. Push to Feature Branches

**Trigger:** `push` to `feature/**`, `fix/**`, `hotfix/**`
**Pipeline:** `ci.yml`
**Purpose:** Fast feedback, catch errors early

| Job | Actions | Duration |
|-----|---------|----------|
| `lint` | npm run lint, format:check | ~1-2 min |
| `unit-tests` | npm test, coverage | ~2-5 min |
| `build-check` | npm run build, docker build | ~2-3 min |

**What does NOT run:**
- ❌ Integration tests (too slow)
- ❌ Deploy anywhere
- ❌ Push Docker image

---

### 2. PR to develop

**Trigger:** `pull_request` to `develop`
**Pipeline:** `ci.yml` (extended checks)
**Purpose:** Full validation before merge

| Job | Actions |
|-----|---------|
| `lint-and-test` | lint, test, coverage (fail if < 80%) |
| `integration-tests` | spin up postgres/redis, test:integration |
| `security` | npm audit, trivy, snyk |
| `build-image` | docker build (don't push) |
| `code-quality` | sonarqube scan |

---

### 3. Merge to develop

**Trigger:** `push` to `develop` (merge = push)
**Pipeline:** `deploy-stage.yml`
**Purpose:** Deploy to staging for QA

| Job | Actions |
|-----|---------|
| `build-and-push` | docker build, tag, push to registry |
| `deploy-staging` | kubectl set image, rollout status |
| `smoke-tests` | curl /health, /api/status, /metrics |
| `notify` | Slack notification |

---

### 4. PR to main

**Trigger:** `pull_request` to `main`
**Pipeline:** `ci.yml` (release validation)
**Purpose:** Final validation before production

| Job | Actions |
|-----|---------|
| `full-tests` | unit, integration, e2e tests |
| `staging-validation` | Cypress against staging URL |
| `performance` | k6 load test (100 users) |
| `security-audit` | trivy image, snyk container |
| `release-notes` | generate changelog |

---

### 5. Merge to main

**Trigger:** `push` to `main`
**Pipeline:** `deploy-prod.yml`
**Purpose:** Safe production deployment

| Job | Actions |
|-----|---------|
| `build-production` | docker build, tag (sha + latest + version) |
| `deploy-production` | kubectl set image (with approval gate) |
| `validate-production` | health checks, smoke tests |
| `rollback` | auto-revert if validation fails |
| `create-release` | GitHub release with tag |

---

## Summary Table

| Event | Branch | Pipeline | Jobs |
|-------|--------|----------|------|
| Push | `feature/*` | ci.yml | lint, unit-tests, build-check |
| PR opened | → `develop` | ci.yml | + integration, security, code-quality |
| PR merged | `develop` | deploy-stage.yml | build, push, deploy-staging, smoke-tests |
| PR opened | → `main` | ci.yml | + e2e, performance, security-audit |
| PR merged | `main` | deploy-prod.yml | build, deploy-prod, validate, rollback |

## Per Branch Summary

| Branch | What Happens |
|--------|--------------|
| `feature/*` | Tests only. No deploy. |
| `develop` | Tests on PR, then build + deploy to **staging** on merge |
| `main` | Tests on PR, then build + deploy to **production** on merge |
| `hotfix/*` | Same as feature, but PRs go directly to main |
