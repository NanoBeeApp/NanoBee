# git hooks

## pre-commit

- **Responsibility**: blocks any file under `private/` (the nested private repo) from being committed to the public main repo, acting as a second safety net beyond `.gitignore` (guards against `git add -f`).
- **Dependencies**: none — pure POSIX sh. Must be installed manually into `.git/hooks/pre-commit` to take effect (`.git/hooks` is not tracked by git, so it has to be reinstalled after cloning).
- **Install**: `cp scripts/git-hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit`

## Change history

### 2026-06-12 — Created
- **Motivation**: NanoBee is going open source, but private content (chat history, project planning, etc.) needs to stay inside the working directory so AI can read it, while never entering the public git history.
- **Goal**: on top of `.gitignore` ignoring `/private/`, add a mandatory pre-commit barrier to prevent accidental leaks via `git add -f`.
- **Key decision**: keep the hook source versioned under `scripts/git-hooks/` and copy it into `.git/hooks/` on install (no `core.hooksPath`, to avoid touching git config).

### 2026-06-12 — Translated to English
- **Motivation**: this is a public repository; per the language rules in `CLAUDE.md`, all public comments and docs must be in English (Chinese content lives only under `private/`).
- **Goal**: translate the hook's comments/messages and this doc to English without changing behavior.
