# Code Journey: Where Changes Exist

Step-by-step tracking of where your code changes physically exist.

---

## Step 1: Local Development

**Where changes exist:** YOUR MACHINE ONLY

```
Your laptop
┌─────────────────┐
│ feature/x       │ ◄── changes HERE
│ + new code      │
└─────────────────┘

Remote (GitHub)
┌─────────────────┐
│ develop         │ ◄── no changes
│ main            │ ◄── no changes
└─────────────────┘
```

---

## Step 2: git push origin feature/x

**Where changes exist:** YOUR MACHINE + REMOTE FEATURE BRANCH

```
Your laptop
┌─────────────────┐
│ feature/x       │ ◄── changes HERE
└─────────────────┘

Remote (GitHub)
┌─────────────────┐
│ feature/x       │ ◄── changes HERE (copied)
│ develop         │ ◄── no changes
│ main            │ ◄── no changes
└─────────────────┘

CI runs: ci.yml (test only, on feature/x)
```

---

## Step 3: Create PR (feature/x → develop)

**Where changes exist:** YOUR MACHINE + REMOTE FEATURE + TEMP MERGE COMMIT

```
Your laptop
┌─────────────────┐
│ feature/x       │ ◄── changes HERE
└─────────────────┘

Remote (GitHub)
┌─────────────────────────────────────┐
│ feature/x            │ ◄── changes HERE
│ develop              │ ◄── NO changes yet
│ main                 │ ◄── NO changes
│                      │
│ refs/pull/123/merge  │ ◄── TEMP merge commit
│ (temporary, hidden)  │     (develop + feature/x)
│                      │     CI tests THIS
└─────────────────────────────────────┘

CI runs: ci.yml (test on merge commit)

develop branch: UNCHANGED
Staging server: UNCHANGED
```

---

## Step 4: Click "Merge Pull Request"

**Where changes exist:** REMOTE DEVELOP BRANCH (finally!)

```
Remote (GitHub)
┌─────────────────────────────────────┐
│ feature/x            │ ◄── still here (can delete)
│ develop              │ ◄── CHANGES NOW HERE ✓
│ main                 │ ◄── no changes
└─────────────────────────────────────┘

CI runs: deploy-stage.yml (triggered by push to develop)
```

---

## Step 5: deploy-stage.yml runs

**Where changes exist:** DEVELOP + DOCKER REGISTRY + STAGING SERVER

```
Remote (GitHub)
┌─────────────────┐
│ develop         │ ◄── changes HERE
│ main            │ ◄── no changes
└─────────────────┘

Docker Registry (ghcr.io)
┌─────────────────┐
│ app:staging     │ ◄── changes HERE (as image)
│ app:abc123      │
└─────────────────┘

Staging Server
┌─────────────────┐
│ Running app     │ ◄── CHANGES LIVE HERE ✓
│ stage.app.com   │
└─────────────────┘

Production Server
┌─────────────────┐
│ Running app     │ ◄── NO changes (old code)
│ app.com         │
└─────────────────┘
```

---

## Step 6: Create PR (develop → main)

**Where changes exist:** DEVELOP + STAGING + TEMP MERGE COMMIT

```
Remote (GitHub)
┌─────────────────────────────────────┐
│ develop              │ ◄── changes HERE
│ main                 │ ◄── NO changes yet
│ refs/pull/456/merge  │ ◄── TEMP (main + develop)
└─────────────────────────────────────┘

CI runs: ci.yml (e2e, performance tests)

main branch: UNCHANGED
Production: UNCHANGED
```

---

## Step 7: Merge to main

**Where changes exist:** DEVELOP + MAIN

```
Remote (GitHub)
┌─────────────────┐
│ develop         │ ◄── changes HERE
│ main            │ ◄── CHANGES NOW HERE ✓
└─────────────────┘

CI runs: deploy-prod.yml
```

---

## Step 8: deploy-prod.yml runs

**Where changes exist:** EVERYWHERE

```
Remote (GitHub)
┌─────────────────┐
│ develop         │ ◄── changes HERE
│ main            │ ◄── changes HERE
└─────────────────┘

Docker Registry
┌─────────────────┐
│ app:latest      │ ◄── changes HERE
│ app:v42         │ ◄── changes HERE
│ app:staging     │ ◄── changes HERE
└─────────────────┘

Staging Server
┌─────────────────┐
│ stage.app.com   │ ◄── changes HERE
└─────────────────┘

Production Server
┌─────────────────┐
│ app.com         │ ◄── CHANGES LIVE HERE ✓
└─────────────────┘
```

---

## Summary: Where Changes Hit

| Step | Action | Where Changes Land |
|------|--------|-------------------|
| 1 | Code locally | Local machine only |
| 2 | `git push` | + Remote feature branch |
| 3 | Create PR | + Temp merge commit (for CI) |
| 4 | Merge to develop | + develop branch |
| 5 | Deploy staging | + Docker registry + Staging server |
| 6 | Create PR to main | + Another temp merge commit |
| 7 | Merge to main | + main branch |
| 8 | Deploy prod | + Production server |

---

## Key Insight

```
PR created     → target branch UNCHANGED (only temp commit for testing)
PR merged      → target branch NOW HAS changes → triggers deploy

Code doesn't hit develop until you click MERGE.
Code doesn't hit staging until deploy-stage.yml runs.
Code doesn't hit prod until deploy-prod.yml runs.
```
