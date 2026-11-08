# CLAUDE.md

Bun CLI (`caddy+`) that manages site blocks in a Caddyfile. Single-file CLI: `src/index.ts`.

## Commands

- `bun install`
- `bun link` — makes the `caddy+` bin (in `package.json` → `bin`) available globally as a symlink to source; edits apply instantly
- `bun src/index.ts <cmd>` — run without linking

## Behavior

- Default Caddyfile: `~/caddy/Caddyfile`, override with `CADDYFILE` env
- Parser is a regex over flat site blocks (`name { ... }`) — intentionally no AST lib; blocks never nest here. If they ever do, swap `parseBlocks`
- `add`/`remove` write the file then run `caddy reload --config <path>`; reload failure is a warning, not an error
- Tests historically run against a temp `CADDYFILE` copy with a fake `caddy` on PATH — never let tests hit the real `caddy reload`, it mutates the running Caddy's in-memory config

## Git

- Conventional Commits enforced by commitlint via `.husky/commit-msg`
- No staging/committing without being asked
