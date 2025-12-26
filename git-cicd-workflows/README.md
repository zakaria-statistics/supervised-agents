# Git, CI/CD & Workflows

Complete documentation for GitFlow branching strategy and CI/CD pipeline setup.

## Quick Reference

```
Branch          Action              Pipeline              Purpose
─────────────────────────────────────────────────────────────────
feature/*       push                ci.yml                TEST
feature/*       PR → develop        ci.yml                TEST (full)
develop         merge (push)        deploy-stage.yml      BUILD + DEPLOY
develop         PR → main           ci.yml                TEST (release)
main            merge (push)        deploy-prod.yml       BUILD + DEPLOY
hotfix/*        PR → main           ci.yml                TEST (fast-track)
```

## Documentation

| File | Description |
|------|-------------|
| [01-gitflow-branches.md](./01-gitflow-branches.md) | Branch strategy and naming |
| [02-pipeline-mapping.md](./02-pipeline-mapping.md) | Which pipeline runs where |
| [03-pr-vs-merge.md](./03-pr-vs-merge.md) | PR phase vs Merge phase |
| [04-code-journey.md](./04-code-journey.md) | Where code exists at each step |
| [05-merge-refs-conflicts.md](./05-merge-refs-conflicts.md) | Temp merge commits and conflicts |

## Workflow Files

| File | Trigger | Purpose |
|------|---------|---------|
| [ci.yml](./.github/workflows/ci.yml) | Push, PR | Test only |
| [deploy-stage.yml](./.github/workflows/deploy-stage.yml) | Merge to develop | Deploy to staging |
| [deploy-prod.yml](./.github/workflows/deploy-prod.yml) | Merge to main | Deploy to production |

## Visual: Complete Flow

```
feature/* ──push──► ci.yml (test)
     │
     └──PR──► ci.yml (test) ──merge──► develop ──► deploy-stage.yml ──► STAGING
                                            │
                                            └──PR──► ci.yml (test) ──merge──► main ──► deploy-prod.yml ──► PROD
```

## Key Concepts

- **PR phase**: Validate code (TEST) - triggers `pull_request`
- **Merge phase**: Ship code (BUILD + DEPLOY) - triggers `push`
- **Conflict**: Blocks merge ref creation, PR stays open, CI can't run
- **Merge commit**: `refs/pull/N/merge` - a ref, not a branch
