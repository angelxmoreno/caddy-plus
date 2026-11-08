# caddy+

CLI for managing local dev domains in your Caddyfile.

```bash
caddy+ list              # table of domains + ports
caddy+ list --json       # machine-readable output
caddy+ add bob 7877      # bob.localhost → localhost:7877 (+ caddy reload)
caddy+ remove bob        # remove block (+ caddy reload)
caddy+ edit              # open Caddyfile in $EDITOR, reload after exit
caddy+ open bob          # open bob.localhost in browser
```

Bin name is `caddy+` (package name is `caddy-plus`). Install with `bun install -g` or `bun link`.

Caddyfile path: `~/caddy/Caddyfile`, override with `CADDYFILE` env.

Platform support: macOS/Linux/Windows. `open` uses `open` / `xdg-open` / `cmd /c start`. On Windows, Caddy reload needs the Caddy service or process running; trust certs with `caddy trust`.

## Development

```bash
bun install
bun link        # symlink caddy+ bin to this source; edits apply instantly
bun src/index.ts list   # run without linking
```

## Git

Conventional Commits enforced via husky + commitlint (`feat:`, `fix:`, `chore:`, ...).
