# Merge Refs & Conflicts

## Branch vs Ref vs Commit

```
BRANCH (what you normally use)
──────────────────────────────
refs/heads/feature/x     ← branch
refs/heads/develop       ← branch
refs/heads/main          ← branch

• You create them
• You push to them
• Visible in: git branch -a
• You can checkout: git checkout feature/x


TEMP MERGE REF (what GitHub creates for PRs)
──────────────────────────────────────────────
refs/pull/123/head       ← points to your PR's latest commit
refs/pull/123/merge      ← points to simulated merge commit

• GitHub creates automatically
• You can't push to it
• NOT visible in: git branch -a
• Hidden, but fetchable
```

## What GitHub Creates for a PR

```
You open PR #123: feature/x → develop

GitHub automatically:

1. Creates ref: refs/pull/123/head
   └── points to: latest commit on feature/x

2. Creates ref: refs/pull/123/merge
   └── points to: NEW COMMIT (develop + feature/x merged)
   └── this commit has no branch
   └── it's "floating" - only the ref points to it
```

## Visual

```
                         develop
                            │
    A ── B ── C ── D ◄──────┘
              │
              └── E ── F ◄── feature/x (branch)
                       │
                       └── refs/pull/123/head (ref)


    A ── B ── C ── D ── M ◄── refs/pull/123/merge (ref)
              │         │
              └── E ── F┘

    M = merge commit (no branch, only ref points to it)
```

## Accessing Merge Ref Locally

```bash
# Fetch the PR merge commit locally (optional, rarely needed)
git fetch origin refs/pull/123/merge
git checkout FETCH_HEAD

# Now you're on the temp merge commit
# But there's no branch - you're in "detached HEAD"
```

---

# Conflicts

## With Conflict: Merge Ref Does NOT Exist

```
NO CONFLICT
───────────────────────────────────────────
refs/pull/123/head    ✓ exists (your commits)
refs/pull/123/merge   ✓ exists (merged result)
                            │
                            └── CI runs on this


CONFLICT
───────────────────────────────────────────
refs/pull/123/head    ✓ exists (your commits)
refs/pull/123/merge   ✗ DOES NOT EXIST
                            │
                            └── CI has nothing to run on
```

## Why Merge Ref Can't Be Created

```
develop:    A ── B ── C    (changed line 10)
                 │
feature/x:       └── D     (also changed line 10, differently)


GitHub tries to create merge commit:

    A ── B ── C ── M    ← M = merge of C + D
              │    │
              └── D┘

    But C and D conflict!

    GitHub: "I don't know how to create M"
    GitHub: "I won't create refs/pull/123/merge"
```

## What GitHub Shows

```
┌─────────────────────────────────────────────────────────┐
│  PR #123: feature/x → develop                           │
│                                                         │
│  ⚠️  Can't automatically merge                          │
│                                                         │
│  refs/pull/123/head  → exists (points to your code)     │
│  refs/pull/123/merge → MISSING (conflict)               │
│                                                         │
│  CI Status: ⏸️ Not running (no merge commit to test)    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Conflict Does NOT Close PR

```
PR #123: feature/x → develop

CONFLICT DETECTED
─────────────────────────────────────────────
PR Status:        OPEN (not closed)
PR Exists:        YES (not deleted)
Merge Button:     DISABLED (blocked)
CI:               NOT RUNNING (no merge ref)

You can still:
  • View the PR
  • Add comments
  • Review code
  • Push fixes
```

## PR States

| State | What It Means | Can Merge? |
|-------|---------------|------------|
| **Open** | Active, waiting for review/merge | Depends |
| **Open + Conflict** | Active, but blocked | No (fix first) |
| **Open + CI Failed** | Active, but blocked | No (fix first) |
| **Open + Approved** | Ready to merge | Yes |
| **Merged** | Code is in target branch | Done |
| **Closed** | Manually closed (abandoned) | No |

## Conflict Resolution

```
Developer must:
    │
    ├── Option A: Fix locally
    │   git checkout feature/x
    │   git merge develop
    │   # resolve conflicts
    │   git commit
    │   git push
    │
    └── Option B: Fix in GitHub UI
        (only for simple conflicts)

              │
              ▼
        Conflict resolved
              │
              ▼
        GitHub retries merge commit
              │
              ▼
        refs/pull/123/merge created ✓
              │
              ▼
        CI starts running ✓
```

## Summary

| Situation | `refs/pull/N/head` | `refs/pull/N/merge` | CI Runs? |
|-----------|-------------------|---------------------|----------|
| No conflict | Exists | Exists | Yes |
| Conflict | Exists | **Missing** | **No** |
| Conflict fixed | Exists | Created | Yes |

| Thing | Type | Created By | Persistent? |
|-------|------|------------|-------------|
| `feature/x` | Branch | You | Yes, until deleted |
| `develop` | Branch | You | Yes |
| `refs/pull/123/merge` | Ref | GitHub | Temporary (PR lifetime) |

**No merge ref = No CI = Must fix conflict first.**
