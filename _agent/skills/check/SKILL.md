---
name: check
description: 'Run the complete project verification suite: Markdown lint, backend and frontend tests, static analysis, frontend production build, Playwright E2E, and dependency, image, and secret security scans. Use when asked to check, verify, or validate the repository.'
argument-hint: 'Optional focus or known blocker'
---

# Full Project Check

Run the repository checks and report each result. Work from the repository root and follow `AGENTS.md`.

## Procedure

1. Run Markdown lint:

   ```bash
   npx markdownlint-cli $(git ls-files -co --exclude-standard '*.md')
   ```

2. Run backend and frontend quality gates:

   ```bash
   scripts/check-quality.sh
   ```

   This runs backend Checkstyle, JUnit and JaCoCo coverage checks, then frontend TypeScript, Oxlint, Vitest and coverage checks.

3. Run the frontend production build:

   ```bash
   cd frontend && npm run build
   ```

4. Prepare and run Playwright E2E:

   - Check listeners on ports `25800` and `25801` with `lsof -iTCP:<port> -sTCP:LISTEN`.
   - If project-owned app servers are listening, inspect `scripts/stop-servers.sh --dry-run`, then run `scripts/stop-servers.sh` to stop only those project processes.
   - If an unknown process occupies either port, do not stop it. Report the conflict and mark E2E as blocked; continue with independent checks.
   - Start only the E2E database service with `docker compose up -d postgres-e2e`.
   - If Playwright Chromium is not installed, install it with `cd frontend && npx playwright install chromium`.
   - Run `cd frontend && npm run e2e`. Playwright starts the app servers and must not reuse an existing development server.

5. Run dependency, image, secret, and backend security checks:

   ```bash
   scripts/security-scan.sh
   ```

   This requires Docker and network access. It builds or replaces the local `marketplace-backend:scan` and `marketplace-frontend:scan` image tags and uses the `trivy-cache` Docker volume. Do not remove images, volumes, or containers as cleanup.

## Reporting

- Run independent checks even if another check fails, unless a failed prerequisite makes them impossible.
- Report the exact command and outcome for each check, including blocked checks and their reason.
- Do not claim success for skipped or unavailable checks. Do not use broad process-kill or Docker cleanup commands.
