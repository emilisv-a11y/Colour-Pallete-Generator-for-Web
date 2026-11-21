---
name: ship-to-live-site
description: Routine for verifying, committing, pushing and deploying D5 WebTool changes to the live GitHub Pages site (branch, PR, merge to main, confirm the Pages workflow). Use when finishing a feature in this repo or when the user asks to deploy or put something live.
---

# Ship to the live site

The live site is https://emilisv-a11y.github.io/Colour-Pallete-Generator-for-Web/, deployed by `.github/workflows/deploy.yml` on every push to `main`.

## Before starting new work

The session branch is reused across features. If its last pull request was merged, restart the branch from `main`:

```bash
git fetch -q origin main && git checkout -q -B <session-branch> origin/main
```

## Verify

```bash
npx tsc -b && npm test && npm run build
```

Then follow the `verify-in-browser` skill: desktop and 390px phone, no console errors, screenshots. Send the screenshots to the user.

## Commit and push

- Update `PLAN.md` (tick the items) and `README.md` (features list) as part of the change.
- Write a commit message with a short title and bullet details. End it with the attribution lines the harness provides, and never mention a model name.
- `git push -u origin <session-branch>`. Retry network errors with backoff.

## Deploy: always ask first

Ask with one question ("Merge and deploy (Recommended)" / "Not yet"). Earlier approval doesn't carry over. On yes:

1. `mcp__github__create_pull_request`: base `main`, head the session branch, with bullets of what changed and the test count. End with the PR attribution lines.
2. `mcp__github__merge_pull_request` with merge method `merge`.
3. Wait about 70 seconds using an until-loop on a deadline (plain `sleep` is blocked). Then check the run with `mcp__github__actions_list` (`list_workflow_runs`, `perPage: 1`). Expect `status: completed`, `conclusion: success`.
4. If it failed, fetch the logs with `mcp__github__get_job_logs` (`failed_only: true`). "Ensure GitHub Pages has been enabled" means Settings → Pages → Source must be set to "GitHub Actions".

The sandbox can't open `*.github.io`, so confirm deploys through the workflow status.

## Tell the user

- The link to the new page, plus "hard-refresh with Ctrl/⌘+Shift+R".
- What's new, written for a designer rather than a developer.
- Anything untested, e.g. a real Divi import or an API key flow.
