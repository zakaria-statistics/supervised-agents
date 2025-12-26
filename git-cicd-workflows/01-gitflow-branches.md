# GitFlow Branch Strategy

## Branch Types

```
main (or master)     → Production code (what users see)
develop              → Integration branch (staging environment)
feature/*            → Work in progress (one feature per branch)
hotfix/*             → Urgent production fixes
release/*            → Preparing a release (optional)
```

## Branch-to-Environment Mapping

| Branch | Environment | URL | Auto-Deploy |
|--------|-------------|-----|-------------|
| `feature/*` | Local (dev) | localhost | No |
| `develop` | Staging | stage.app.com | Yes (on merge) |
| `main` | Production | app.com | Yes (with approval) |

## Visual: GitFlow

```
                         PRODUCTION
                        (main branch)
                             │
              ┌──────────────┴──────────────┐
              │         Tag v1.0            │
              │         Tag v1.1            │
              │         Tag v2.0            │
              └──────────────┬──────────────┘
                             │
                    merge PR (approved)
                             │
                         STAGING
                     (develop branch)
                             │
                    merge PR (approved)
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
feature/auth          feature/metrics          feature/logs
    │                        │                        │
    └────────────────────────┴────────────────────────┘
                        LOCAL DEV
                  (developer's machine)
```

## Branch Naming Conventions

```bash
# Features - new functionality
feature/add-user-auth
feature/metrics-endpoint
feature/dark-mode

# Fixes - bug fixes (non-urgent)
fix/login-validation
fix/memory-leak

# Hotfixes - urgent production fixes
hotfix/security-patch
hotfix/crash-on-startup

# Releases (optional) - preparing versioned releases
release/v1.2.0
release/v2.0.0
```

## Branch Lifecycle

```
1. Create branch from develop
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature

2. Work on feature
   # make changes
   git add .
   git commit -m "Add feature"

3. Push to remote
   git push origin feature/my-feature

4. Create PR → develop
   # On GitHub: Create Pull Request

5. After merge, delete branch
   git branch -d feature/my-feature
   git push origin --delete feature/my-feature
```

## Branch Protection Rules

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
✅ Require specific reviewers (Zack - DevOps Lead)
✅ Require all status checks to pass
❌ Allow force push (never!)
```

## Hotfix Flow

When production is broken and can't wait:

```
main (broken)
    │
    └── hotfix/fix-crash
            │
            ├── PR → main (fast review, Zack approves)
            │         │
            │         └── Deploy to PROD immediately
            │
            └── PR → develop (keep branches in sync)
```
