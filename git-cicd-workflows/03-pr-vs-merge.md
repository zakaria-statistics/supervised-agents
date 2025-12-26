# PR Phase vs Merge Phase

## Two Distinct Phases

```
┌─────────────────────────────────────────────────────────────────────┐
│                           PR PHASE                                  │
│                     (Review & Validate)                             │
│                                                                     │
│  Trigger: pull_request (opened, synchronize, reopened)              │
│  Branch: Temporary merge commit                                     │
│  Purpose: TEST - validate before allowing merge                     │
│  Deploys: Nothing                                                   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                         MERGE PHASE                                 │
│                      (Build & Deploy)                               │
│                                                                     │
│  Trigger: push (merge = push to target branch)                      │
│  Branch: Target branch (develop or main)                            │
│  Purpose: BUILD + DEPLOY - ship validated code                      │
│  Deploys: Staging or Production                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Comparison

| | PR Phase | Merge Phase |
|---|----------|-------------|
| **Trigger** | `pull_request` | `push` |
| **When** | PR opened/updated | Merge button clicked |
| **Code tested** | Simulated merge commit | Actual target branch |
| **Jobs** | Test, lint, security, build-check | Build, push image, deploy |
| **Artifacts** | None (or temp image) | Docker image in registry |
| **Environment** | None | Staging or Prod |
| **Reversible** | Yes (just close PR) | Need rollback |

## PR Tests the Merge Commit

When you create PR: `feature/x` → `develop`

```
feature/x (source)     develop (target)
     │                      │
     │                      │
     └──────────┬───────────┘
                │
                ▼
         MERGE COMMIT  ◄── CI runs HERE
         (temporary)
```

**CI tests the simulated result of merging source INTO target.**

## Why This Matters

```
develop:    A ── B ── C ── D        (target has new commits)
                 │
feature/x:       └── E ── F ── G    (your feature branch)

PR CI runs on:   A ── B ── C ── D ── [E+F+G merged]
                                          │
                                          └── tests THIS
```

If you only tested `feature/x` alone, you'd miss conflicts with C and D.

## What This Catches

| Issue | Detected? |
|-------|-----------|
| Bug in your feature code | Yes |
| Merge conflict with target | Yes (blocks CI) |
| Your code breaks target's new code | Yes |
| Target's new code breaks your feature | Yes |

## GitHub Environment Variables

```yaml
on:
  pull_request:
    branches: [develop]

# Available variables:
# GITHUB_SHA       = merge commit (source merged into target)
# GITHUB_HEAD_REF  = feature/x (source branch)
# GITHUB_BASE_REF  = develop (target branch)
```

## Timeline

```
Developer                     GitHub                        CI/CD
    │                           │                             │
    │── Create PR ─────────────►│                             │
    │                           │                             │
    │                    Create merge commit                  │
    │                           │                             │
    │                           │── Trigger ──────────────────►│
    │                           │   pull_request              │
    │                           │                             │
    │                           │              ┌──────────────┤
    │                           │              │ RUN TESTS    │
    │                           │              │ (on merge    │
    │                           │              │  commit)     │
    │                           │              └──────────────┤
    │                           │                             │
    │                    ┌──────┴──────┐                      │
    │               TESTS FAIL    TESTS PASS                  │
    │                    │             │                      │
    │               PR blocked    PR ready                    │
    │                                  │                      │
    │── Click "Merge" ────────────────►│                      │
    │                                  │                      │
    │                           Commits added                 │
    │                           to target                     │
    │                                  │                      │
    │                                  │── Trigger ───────────►│
    │                                  │   push               │
    │                                  │                      │
    │                                  │       ┌──────────────┤
    │                                  │       │ BUILD        │
    │                                  │       │ PUSH         │
    │                                  │       │ DEPLOY       │
    │                                  │       └──────────────┤
    │                                  │                      │
    │                                  ▼                      ▼
    │                           Code live in staging/prod
```

## Key Insight

```
PR created   → target branch UNCHANGED (only temp commit for testing)
PR merged    → target branch NOW HAS changes → triggers deploy

Code doesn't hit target until you click MERGE.
```
