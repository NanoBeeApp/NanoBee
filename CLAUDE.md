# NanoBee

This project is a **public open-source repository**. **The public repo must only contain public code and public documentation** — every other file produced during development does not belong here.

## 🌐 Language rules (important)

- **Everything in the public repo (outside `private/`) must be written in English**: code comments, docs, README files, script messages, etc. This is a public-facing repository.
- **Everything inside `private/` is written in Chinese** (chat history, planning, PRDs, logs, notes).
- This project rule overrides the global "write comments/docs in Chinese" preference. Conversation with the user stays in Chinese.

## 🔒 private/ directory (important)

- `private/` is an **independent private git repository** (remote: `WooodHead/NanoBee_Private`) nested inside this repo and ignored by the main repo's `.gitignore`.
- **AI can and should read** the contents of `private/` (chat history, project planning, etc.) as context.
- **All non-public files created during development must be written under `private/`** — never into the public directories of the main repo. This includes, but is not limited to:
  - Chat logs / chat-history screenshots with AI → `private/chat-history/`
  - Requirements documents (PRD) → `private/docs/` (e.g. `private/docs/requirements.md`)
  - Logs → `private/logs/`
  - Project planning, ideas, unpublished roadmaps → `private/planning/`
  - Design drafts, screenshots, prompts, debugging/explanatory artifacts → `private/design/`, `private/screenshots/`, `private/prompts/`, `private/explain/`
- **Rule of thumb**: if a file is not "code or documentation intended for external users", it goes into `private/`; when in doubt, default to `private/`.
- **Version-control rules**:
  - Changed files under `private/` → `git add / commit / push` separately inside the `private/` directory (pushed to the private remote).
  - Changed files in the main repo → commit normally at the repo root; `private/` is ignored automatically.
  - 🚫 Never commit files under `private/` to the main repo under any circumstances (`.gitignore` + pre-commit hook provide double protection — do not bypass them).
- After cloning this repo, reinstall the protection hook: `cp scripts/git-hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit`
