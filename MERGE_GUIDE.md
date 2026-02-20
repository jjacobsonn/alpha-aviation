# Monorepo Merge Guide: Backend + Frontend → alpha-aviation

Combine **aviation-backend** and **aviation-web** into this repo with full history preserved using `git subtree`.

---

## 1) Exact Git Commands

**Assumptions:** Default branch is `main` for all three repos. If yours use `master`, replace `main` below.

### Option A: Start from existing alpha-aviation clone (this repo)

```bash
cd /Users/cjacobson/alpha-aviation

# Remove empty placeholder dirs so subtree can create them (skip if not present)
rmdir backend frontend 2>/dev/null || true

# Initialize git if this folder is not yet a repo
git init
git branch -M main

# Add remotes for the two source repos
git remote add backend-repo https://github.com/Alpha-Aviation-e2i/aviation-backend.git
git remote add frontend-repo https://github.com/Alpha-Aviation-e2i/aviation-web.git

# Fetch everything (no merge yet)
git fetch backend-repo
git fetch frontend-repo

# First subtree: bring backend history into /backend
git subtree add --prefix=backend backend-repo main --squash
# To preserve full history (no squash), use:
git subtree add --prefix=backend backend-repo main

# Second subtree: bring frontend history into /frontend
git subtree add --prefix=frontend frontend-repo main --squash
# To preserve full history (no squash), use:
git subtree add --prefix=frontend frontend-repo main
```

**Important:** You asked to preserve ALL history, so **do not use `--squash`**. Use:

```bash
git subtree add --prefix=backend backend-repo main
git subtree add --prefix=frontend frontend-repo main
```

### If you prefer a completely fresh monorepo (new folder, new GitHub repo)

```bash
# 1) Create the new repo on GitHub: Alpha-Aviation-e2i/alpha-aviation (or your chosen name)

# 2) Clone it (or create and push from scratch)
git clone https://github.com/Alpha-Aviation-e2i/alpha-aviation.git alpha-aviation-monorepo
cd alpha-aviation-monorepo

# 3) Add remotes and fetch
git remote add backend-repo https://github.com/Alpha-Aviation-e2i/aviation-backend.git
git remote add frontend-repo https://github.com/Alpha-Aviation-e2i/aviation-web.git
git fetch backend-repo
git fetch frontend-repo

# 4) Subtree add (full history, no --squash)
git subtree add --prefix=backend backend-repo main
git subtree add --prefix=frontend frontend-repo main

# 5) Push to the new monorepo
git push -u origin main
```

### If default branch is `master` on any repo

Use the branch name that each remote actually uses:

```bash
# Check default branch on remotes (after fetch)
git remote show backend-repo  | grep "HEAD branch"
git remote show frontend-repo | grep "HEAD branch"

# Then use that branch in subtree add, e.g.:
git subtree add --prefix=backend backend-repo master
git subtree add --prefix=frontend frontend-repo main
```

---

## 2) How to Verify History Is Preserved

- **Log for a single prefix (only commits that touched that path):**
  ```bash
  git log --oneline -- backend
  git log --oneline -- frontend
  ```
- **Full log for a prefix (show patch for that path):**
  ```bash
  git log -p -- backend
  git log -p -- frontend
  ```
- **Count commits per prefix:**
  ```bash
  git log --oneline -- backend | wc -l
  git log --oneline -- frontend | wc -l
  ```
- **Compare to original repos:** In a separate clone of `aviation-backend` and `aviation-web`, run `git log --oneline | wc -l` and compare counts to the monorepo prefix counts above; they should match (or be very close if the original had merges).
- **Verify a specific file’s history:**
  ```bash
  git log --oneline -- backend/package.json
  git log -- frontend/README.md
  ```

---

## 3) Minimal Root README Plan

See the root **README.md** in this repo for:

- One-line project description
- **Backend:** how to run (e.g. `cd backend && npm install && npm run dev` or equivalent)
- **Frontend:** how to run (e.g. `cd frontend && npm install && npm start`)
- Optional: link to backend/frontend READMEs for full docs

---

## 4) Common Pitfalls and Fixes

| Pitfall | What happens | Fix |
|--------|----------------|-----|
| **Branch name mismatch** | `git subtree add ... main` fails with “ref not found” or similar | Run `git remote show backend-repo` and `git remote show frontend-repo` and use the reported HEAD branch (e.g. `master`) in `subtree add`. |
| **Prefix dirs already exist** | Subtree add complains about existing path | Remove or rename existing `backend`/`frontend` dirs (and drop them from the index if already committed: `git rm -r --cached backend frontend` then `git subtree add`). |
| **Merge conflicts during subtree add** | Conflict markers in files (e.g. both repos had a root README) | Resolve as usual: edit files, `git add`, then run `git commit` (no `git merge --continue`; the subtree command is doing the merge). Prefer resolving in favor of one repo or the other, or combining content by hand. |
| **Wrong remote or branch** | You add the wrong repo or branch under a prefix | Before pushing: `git reset --hard HEAD~1` (or to the commit before the bad subtree add), then re-run `git subtree add` with the correct remote and branch. |
| **Large history / timeout** | Fetch or subtree add is very slow or times out | Increase buffer: `git config http.postBuffer 524288000`; use SSH if HTTPS is flaky; run fetch/subtree on a fast network. |
| **Want to redo the merge** | You haven’t pushed yet and want a clean try | `git reset --hard HEAD~2` (or to before both subtree adds), remove `backend`/`frontend` if needed, then re-run the two `subtree add` commands. |

---

## Quick reference (copy-paste, full history)

```bash
cd /path/to/alpha-aviation
rmdir backend frontend 2>/dev/null || true
git init && git branch -M main
git remote add backend-repo https://github.com/Alpha-Aviation-e2i/aviation-backend.git
git remote add frontend-repo https://github.com/Alpha-Aviation-e2i/aviation-web.git
git fetch backend-repo && git fetch frontend-repo
git subtree add --prefix=backend backend-repo main
git subtree add --prefix=frontend frontend-repo main
git remote add origin https://github.com/Alpha-Aviation-e2i/alpha-aviation.git  # if new
git push -u origin main
```

Then verify:

```bash
git log --oneline -- backend | wc -l
git log --oneline -- frontend | wc -l
```
