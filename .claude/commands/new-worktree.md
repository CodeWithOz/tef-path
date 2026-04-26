/new-worktree creates an isolated git worktree for parallel feature development.

Usage:
- `/new-worktree <verb> <feature name...>`
- Example: `/new-worktree add user notifications`

Behavior:
1. Build a branch slug from the feature words (e.g. `add-user-notifications`).
2. Create a branch named `feature/<slug>` from the current HEAD.
3. Create the worktree at `~/.cursor/worktrees/tef-path/<slug>`.
4. Run setup commands from `.cursor/worktrees.json` inside the new worktree:
   - `npm install`
   - copy root `.env` when present
   - `scripts/check-ports.sh`
   - `scripts/docker-compose-up.sh`
   - `scripts/db-migrate.sh`
5. Print the absolute worktree path and next commands (`cd`, `npm run dev`).

Rules:
- Never delete existing branches/worktrees unless explicitly requested.
- If the target worktree path already exists, stop and ask before overwriting/removing.
- If setup command fails, report the exact failed command and keep partial setup for debugging.
