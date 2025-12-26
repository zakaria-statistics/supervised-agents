# Git, CI/CD, and Environments Explained

How code flows from developer's machine to production through branches, PRs, and pipelines.

---

## Core Concepts

### Git Branches = Code Versions
```
main (or master)     → Production code (what users see)
develop              → Integration branch (next release)
feature/xyz          → Work in progress (one feature)
hotfix/xyz           → Urgent production fix
release/v1.2         → Preparing a release
```

### Pull Request (PR) = "Please Review My Code"
- Developer says: "I finished feature X, please review and merge"
- Team reviews code, runs tests, approves or requests changes
- After approval → code is merged into target branch

### CI/CD = Automated Actions on Git Events
- **CI (Continuous Integration)**: Run tests on every push/PR
- **CD (Continuous Delivery)**: Auto-deploy after merge (with approval)
- **CD (Continuous Deployment)**: Auto-deploy without approval (risky)

---

## Branch Strategy: GitFlow (Simplified)

```
                    ┌─────────────────────────────────────┐
                    │           PRODUCTION                │
                    │         (main branch)               │
                    └──────────────┬──────────────────────┘
                                   │
                         merge PR (approved)
                                   │
                    ┌──────────────┴──────────────────────┐
                    │            STAGING                  │
                    │        (develop branch)             │
                    └──────────────┬──────────────────────┘
                                   │
                         merge PR (approved)
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
   feature/auth            feature/metrics           feature/logs
   (Claude)                (Claude)                  (Codex)
         │                         │                         │
         └─────────────────────────┴─────────────────────────┘
                           LOCAL DEV
                    (each developer's machine)
```

---

## Step-by-Step: Feature Development Lifecycle

### 1. Start New Feature

```bash
# Developer starts from develop branch
git checkout develop
git pull origin develop
git checkout -b feature/add-metrics-endpoint
```

**What happens:** New branch created locally, no CI/CD triggered yet.

### 2. Develop Locally (Dev Environment)

```bash
# Make changes, test locally
npm run dev                    # Run app locally
npm test                       # Run tests
git add .
git commit -m "Add /metrics endpoint"
```

**Environment:** Dev (localhost)
**CI/CD:** Nothing yet (commits are local)

### 3. Push Branch to Remote

```bash
git push origin feature/add-metrics-endpoint
```

**What triggers:**
```yaml
# GitHub Actions: on push to any branch
on:
  push:
    branches: ['**']  # All branches

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test        # Run tests
      - run: npm run lint    # Check code style
```

**Result:** CI runs tests. If fail → developer fixes. If pass → ready for PR.

### 4. Create Pull Request

On GitHub: "Create PR from `feature/add-metrics-endpoint` → `develop`"

**What triggers:**
```yaml
on:
  pull_request:
    branches: [develop]

jobs:
  test:
    # Run full test suite
  security:
    # Run security scans
  build:
    # Build Docker image (but don't push yet)
```

**What happens:**
- CI runs all checks
- Team gets notified
- Reviewers assigned (Zack, Gemini, Codex)
- PR shows: ✅ Tests passed, ✅ Security OK, ⏳ Awaiting review

### 5. Code Review

**Reviewers check:**
- Code quality
- Tests included
- Documentation updated
- No security issues

**Possible outcomes:**
- ✅ Approved → Ready to merge
- ❌ Changes requested → Developer fixes, pushes again, CI re-runs

### 6. Merge to Develop (Deploy to Staging)

Click "Merge Pull Request" on GitHub.

**What triggers:**
```yaml
on:
  push:
    branches: [develop]  # Merge = push to develop

jobs:
  build-and-deploy-staging:
    steps:
      - name: Build Docker image
        run: docker build -t app:${{ github.sha }} .

      - name: Push to registry
        run: docker push ghcr.io/team/app:${{ github.sha }}

      - name: Deploy to Staging
        run: kubectl apply -f k8s/overlays/stage/
```

**Environment:** Staging (stage.app.com)
**Result:** New feature live on staging for testing

### 7. Test on Staging

- QA team (Gemini) tests the feature
- Run integration tests
- Run smoke tests
- Check monitoring/logs

**If issues found:** Create new PR to fix, repeat process.

### 8. Create Release PR (Develop → Main)

When staging is stable, create PR: `develop` → `main`

**What triggers:**
```yaml
on:
  pull_request:
    branches: [main]

jobs:
  # Same as before, but stricter checks
  integration-tests:
    # Run against staging environment

  # Require specific approvers
  # Zack (DevOps lead) must approve
```

### 9. Merge to Main (Deploy to Production)

**Option A: Auto-deploy (Continuous Deployment)**
```yaml
on:
  push:
    branches: [main]

jobs:
  deploy-production:
    steps:
      - name: Deploy to Production
        run: kubectl apply -f k8s/overlays/prod/
```

**Option B: Manual approval (Continuous Delivery)**
```yaml
jobs:
  deploy-production:
    environment:
      name: production
      url: https://app.com
    # GitHub requires manual approval before this job runs
    steps:
      - name: Deploy to Production
        run: kubectl apply -f k8s/overlays/prod/
```

---

## Visual: Complete Pipeline

```
Developer pushes code
        │
        ▼
┌───────────────────┐
│   CI: Run Tests   │ ◄── Every push, every PR
└───────┬───────────┘
        │ pass
        ▼
┌───────────────────┐
│   PR Created      │
│   Code Review     │ ◄── Team reviews
└───────┬───────────┘
        │ approved
        ▼
┌───────────────────┐
│ Merge to develop  │
└───────┬───────────┘
        │ triggers
        ▼
┌───────────────────┐
│ Build Docker      │
│ Push to Registry  │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Deploy to STAGING │ ◄── Auto after merge to develop
└───────┬───────────┘
        │ QA tests
        ▼
┌───────────────────┐
│ PR: develop→main  │
│ Release Review    │ ◄── Zack approves
└───────┬───────────┘
        │ approved
        ▼
┌───────────────────┐
│ Merge to main     │
└───────┬───────────┘
        │ triggers
        ▼
┌───────────────────┐
│ Deploy to PROD    │ ◄── Auto or manual approval
└───────────────────┘
```

---

## Branch Protection Rules

Configure on GitHub to enforce the workflow:

### `develop` branch
```
✅ Require PR before merge (no direct push)
✅ Require 1 approval
✅ Require status checks to pass (tests, lint)
✅ Require branch to be up to date
```

### `main` branch
```
✅ Require PR before merge
✅ Require 2 approvals
✅ Require specific reviewers (Zack)
✅ Require all status checks to pass
✅ Require signed commits (optional)
❌ Allow force push (never!)
```

---

## Team Roles in This Workflow

| Role | Actions |
|------|---------|
| **Claude (Dev)** | Create feature branches, write code, create PRs |
| **Gemini (QA)** | Review PRs, test on staging, approve/reject |
| **Codex (Security)** | Review security-sensitive PRs, check vulnerabilities |
| **Zack (Lead)** | Final approval for production deploys, merge to main |

---

## Hotfix: Urgent Production Fix

When production is broken and can't wait for normal flow:

```
main (broken)
    │
    └── hotfix/fix-crash
            │
            ├── PR → main (fast review, Zack approves)
            │         │
            │         └── Deploy to PROD immediately
            │
            └── PR → develop (to keep branches in sync)
```

---

## Environment Summary

| Branch | Environment | Deploy Trigger | Approval |
|--------|-------------|----------------|----------|
| `feature/*` | Dev (local) | Manual | None |
| `develop` | Staging | Auto on merge | 1 reviewer |
| `main` | Production | Auto or manual | 2 reviewers + Zack |
| `hotfix/*` | Production | Fast-track | Zack only |

---

## GitHub Actions File Structure

```
.github/
└── workflows/
    ├── ci.yml              # Tests on every push/PR
    ├── build.yml           # Build image on merge
    ├── deploy-stage.yml    # Deploy to staging
    └── deploy-prod.yml     # Deploy to production
```

---

## CI/CD Jobs Per Branch (Granular Breakdown)

### On `feature/*` Branch - Push

**Trigger:** Developer pushes commits
**Goal:** Fast feedback, catch errors early

```yaml
on:
  push:
    branches:
      - 'feature/**'
      - 'fix/**'
      - 'hotfix/**'

jobs:
  # ─────────────────────────────────────────────
  # JOB 1: Quick checks (runs in ~1-2 min)
  # ─────────────────────────────────────────────
  lint:
    steps:
      - npm run lint           # Code style check
      - npm run format:check   # Prettier check

  # ─────────────────────────────────────────────
  # JOB 2: Unit tests (runs in ~2-5 min)
  # ─────────────────────────────────────────────
  unit-tests:
    steps:
      - npm test               # Fast tests, no DB needed
      - npm run coverage       # Check coverage threshold

  # ─────────────────────────────────────────────
  # JOB 3: Build check (runs in ~2-3 min)
  # ─────────────────────────────────────────────
  build-check:
    steps:
      - npm run build          # Verify it compiles
      - docker build .         # Verify Dockerfile works
      # Note: Image NOT pushed yet (just checking it builds)
```

**What does NOT run:**
- ❌ Integration tests (too slow)
- ❌ Deploy anywhere
- ❌ Push Docker image
- ❌ Security deep scan

---

### On PR to `develop` - Pull Request Event

**Trigger:** Developer opens/updates PR targeting develop
**Goal:** Full validation before merge

```yaml
on:
  pull_request:
    branches: [develop]

jobs:
  # ─────────────────────────────────────────────
  # JOB 1: All unit tests + lint (same as push)
  # ─────────────────────────────────────────────
  lint-and-test:
    steps:
      - npm run lint
      - npm test
      - npm run coverage
      # Fail if coverage < 80%

  # ─────────────────────────────────────────────
  # JOB 2: Integration tests (needs DB)
  # ─────────────────────────────────────────────
  integration-tests:
    services:
      postgres:              # Spin up test DB
        image: postgres:15
      redis:
        image: redis:7
    steps:
      - npm run test:integration
      # Tests API endpoints, DB queries, etc.

  # ─────────────────────────────────────────────
  # JOB 3: Security scanning
  # ─────────────────────────────────────────────
  security:
    steps:
      - npm audit              # Check dependencies
      - run: trivy fs .        # Scan for vulnerabilities
      - run: snyk test         # Deep security scan

  # ─────────────────────────────────────────────
  # JOB 4: Build image (but don't push)
  # ─────────────────────────────────────────────
  build-image:
    steps:
      - docker build -t app:pr-${{ github.event.number }} .
      # Image built but NOT pushed (saves registry space)
      # Just verifying the build works

  # ─────────────────────────────────────────────
  # JOB 5: Code quality
  # ─────────────────────────────────────────────
  code-quality:
    steps:
      - run: sonarqube-scan    # Code smells, duplication
      # Or: CodeClimate, Codacy, etc.
```

**PR Status Checks (all must pass to merge):**
```
✅ lint-and-test
✅ integration-tests
✅ security
✅ build-image
✅ code-quality
⏳ Review: Awaiting approval (1 required)
```

---

### On Merge to `develop` - Deploy to Staging

**Trigger:** PR merged (= push event to develop)
**Goal:** Deploy to staging for QA testing

```yaml
on:
  push:
    branches: [develop]

jobs:
  # ─────────────────────────────────────────────
  # JOB 1: Build & Push Docker Image
  # ─────────────────────────────────────────────
  build-and-push:
    steps:
      - name: Build image
        run: |
          docker build -t ghcr.io/team/app:${{ github.sha }} .
          docker tag ghcr.io/team/app:${{ github.sha }} ghcr.io/team/app:staging

      - name: Push to registry
        run: |
          docker push ghcr.io/team/app:${{ github.sha }}
          docker push ghcr.io/team/app:staging

  # ─────────────────────────────────────────────
  # JOB 2: Deploy to Staging
  # ─────────────────────────────────────────────
  deploy-staging:
    needs: build-and-push    # Wait for image to be pushed
    steps:
      - name: Update K8s deployment
        run: |
          kubectl set image deployment/app \
            app=ghcr.io/team/app:${{ github.sha }} \
            -n staging

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/app -n staging --timeout=300s

  # ─────────────────────────────────────────────
  # JOB 3: Smoke Tests on Staging
  # ─────────────────────────────────────────────
  smoke-tests:
    needs: deploy-staging
    steps:
      - name: Health check
        run: curl -f https://stage.app.com/health

      - name: Basic API test
        run: |
          curl -f https://stage.app.com/api/status
          curl -f https://stage.app.com/metrics

  # ─────────────────────────────────────────────
  # JOB 4: Notify team
  # ─────────────────────────────────────────────
  notify:
    needs: smoke-tests
    steps:
      - name: Slack notification
        run: |
          curl -X POST $SLACK_WEBHOOK \
            -d '{"text": "✅ Deployed to staging: ${{ github.sha }}"}'
```

**If smoke tests fail:**
- Pipeline fails
- Team notified
- Staging has broken code (but prod is safe)
- Developer creates fix PR

---

### On PR to `main` - Release Validation

**Trigger:** PR from develop to main (release candidate)
**Goal:** Final validation before production

```yaml
on:
  pull_request:
    branches: [main]

jobs:
  # ─────────────────────────────────────────────
  # JOB 1: Full test suite (again)
  # ─────────────────────────────────────────────
  full-tests:
    steps:
      - npm test
      - npm run test:integration
      - npm run test:e2e        # End-to-end tests

  # ─────────────────────────────────────────────
  # JOB 2: Test against staging environment
  # ─────────────────────────────────────────────
  staging-validation:
    steps:
      - name: Run E2E against staging
        run: |
          CYPRESS_BASE_URL=https://stage.app.com \
          npm run test:e2e

  # ─────────────────────────────────────────────
  # JOB 3: Performance tests
  # ─────────────────────────────────────────────
  performance:
    steps:
      - name: Load test
        run: |
          k6 run load-test.js   # Simulate 100 users
          # Fail if p95 latency > 500ms

  # ─────────────────────────────────────────────
  # JOB 4: Security deep scan
  # ─────────────────────────────────────────────
  security-audit:
    steps:
      - run: trivy image ghcr.io/team/app:staging
      - run: snyk container test ghcr.io/team/app:staging

  # ─────────────────────────────────────────────
  # JOB 5: Generate release notes
  # ─────────────────────────────────────────────
  release-notes:
    steps:
      - name: Generate changelog
        run: |
          git log main..develop --oneline > CHANGELOG.md
```

**Required approvals:**
```
✅ All CI checks passed
✅ Approved by: Gemini (QA)
✅ Approved by: Zack (Lead) ← Required for main
```

---

### On Merge to `main` - Deploy to Production

**Trigger:** PR merged to main
**Goal:** Safe production deployment with rollback capability

```yaml
on:
  push:
    branches: [main]

jobs:
  # ─────────────────────────────────────────────
  # JOB 1: Build production image
  # ─────────────────────────────────────────────
  build-production:
    steps:
      - name: Build with production tag
        run: |
          docker build -t ghcr.io/team/app:${{ github.sha }} .
          docker tag ghcr.io/team/app:${{ github.sha }} ghcr.io/team/app:latest
          docker tag ghcr.io/team/app:${{ github.sha }} ghcr.io/team/app:v${{ github.run_number }}

      - name: Push all tags
        run: |
          docker push ghcr.io/team/app:${{ github.sha }}
          docker push ghcr.io/team/app:latest
          docker push ghcr.io/team/app:v${{ github.run_number }}

  # ─────────────────────────────────────────────
  # JOB 2: Deploy to production (with approval gate)
  # ─────────────────────────────────────────────
  deploy-production:
    needs: build-production
    environment:
      name: production          # ← GitHub environment with protection
      url: https://app.com
    # ⚠️ This job PAUSES until someone approves in GitHub UI
    steps:
      - name: Save current version (for rollback)
        run: |
          CURRENT=$(kubectl get deployment app -n prod -o jsonpath='{.spec.template.spec.containers[0].image}')
          echo "ROLLBACK_IMAGE=$CURRENT" >> $GITHUB_ENV

      - name: Deploy new version
        run: |
          kubectl set image deployment/app \
            app=ghcr.io/team/app:${{ github.sha }} \
            -n prod

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/app -n prod --timeout=600s

  # ─────────────────────────────────────────────
  # JOB 3: Post-deploy validation
  # ─────────────────────────────────────────────
  validate-production:
    needs: deploy-production
    steps:
      - name: Health checks
        run: |
          for i in {1..5}; do
            curl -f https://app.com/health || exit 1
            sleep 10
          done

      - name: Synthetic monitoring
        run: |
          # Run critical user journeys
          npm run test:smoke:prod

  # ─────────────────────────────────────────────
  # JOB 4: Auto-rollback on failure
  # ─────────────────────────────────────────────
  rollback:
    needs: validate-production
    if: failure()              # ← Only runs if validation failed
    steps:
      - name: Rollback to previous version
        run: |
          kubectl rollout undo deployment/app -n prod

      - name: Notify team of rollback
        run: |
          curl -X POST $SLACK_WEBHOOK \
            -d '{"text": "🚨 ROLLBACK: Production deploy failed, reverted to previous version"}'

  # ─────────────────────────────────────────────
  # JOB 5: Create GitHub release
  # ─────────────────────────────────────────────
  create-release:
    needs: validate-production
    if: success()
    steps:
      - name: Create release tag
        run: |
          gh release create v${{ github.run_number }} \
            --title "Release v${{ github.run_number }}" \
            --notes "Deployed to production on $(date)"
```

---

## Summary: What Runs Where

| Event | Branch | Jobs That Run |
|-------|--------|---------------|
| Push | `feature/*` | lint, unit-tests, build-check |
| PR opened | → `develop` | + integration-tests, security, code-quality |
| PR merged | `develop` | build-push, deploy-staging, smoke-tests |
| PR opened | → `main` | + e2e-tests, performance, security-audit |
| PR merged | `main` | build-prod, deploy-prod (approval), validate, rollback-if-fail |

---

## Rollback Strategies

### Automatic Rollback (on deploy failure)
```yaml
rollback:
  if: failure()
  steps:
    - run: kubectl rollout undo deployment/app -n prod
```

### Manual Rollback (via GitHub Actions UI)
```yaml
# .github/workflows/rollback.yml
on:
  workflow_dispatch:          # Manual trigger button
    inputs:
      version:
        description: 'Version to rollback to'
        required: true

jobs:
  rollback:
    steps:
      - run: |
          kubectl set image deployment/app \
            app=ghcr.io/team/app:${{ github.event.inputs.version }} \
            -n prod
```

### Rollback via Git Revert
```bash
# Create a revert commit
git revert HEAD
git push origin main
# This triggers normal deploy pipeline with reverted code
```

---

## Key Takeaways

1. **Branches isolate work** - Each feature in its own branch
2. **PRs gate quality** - Code must be reviewed before merge
3. **CI runs automatically** - Tests run on every push
4. **CD deploys automatically** - Merge triggers deployment
5. **Environments match branches** - develop→staging, main→production
6. **Protection rules enforce process** - Can't skip reviews
