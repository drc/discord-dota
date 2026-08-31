# AGENTS.md

Discord bot for DOTA2 Game State Integration (GSI): Hono HTTP server receives GSI payloads, triggers Discord voice soundboard clips, posts post-game match links, and logs events to ClickHouse. Bun + TypeScript; backend runs TS directly (no build), frontend is a Svelte 5 app built with Vite.

## Commands

- `bun run dev` — run with `.env` loaded and `--watch` (auto-reload). One-shot without watch: `bun --env-file=.env src/index.ts`
- `bun run dev:web` — Vite dev server for the frontend (`web/`) with HMR; proxies `/api` to `localhost:3000`, so `bun run dev` must be running alongside
- `bun run build:web` — build the frontend to `web/dist` (required for `http://localhost:3000/` to serve the UI)
- `bun run typecheck` — `tsc --noEmit` (backend) + `svelte-check` (frontend, `web/tsconfig.json`)
- `bun run lint` / `bun run lint:fix` — oxlint (skips `*.svelte`; those are covered by svelte-check)
- `bun run fmt` / `bun run fmt:check` — oxfmt
- `bun run test` — vitest
- `bun run registerCommands` — registers slash commands; requires a root `config.json` with `{ token, clientId, guildId }` (not `.env`)

## Local state files (all gitignored, created at runtime)

- `mapping.json` — event→sound mappings; auto-created on first run, edited via Web UI at `http://localhost:3000/` or the `/api/mappings` PUT endpoint. Also holds `discord.userSounds` (per-user voice-join sounds)
- `settings.json` — post-game summary channel ID, set via the `/set-game-summary-channel` slash command
- `sounds/` — MP3 clips the bot plays; add files here (or via `/api/sounds` POST)
- `config.json` — only for `registerCommands`

## Env vars

- `DISCORD_TOKEN` — required for the bot; if missing, Discord startup is skipped with an error log (other components still run)
- `CLICKHOUSE_HOST` — defaults to `http://localhost:8123`
- `ENABLE_DISCORD`, `ENABLE_CLICKHOUSE`, `ENABLE_SERVER` — all default to `true`; set to `false` to disable a component
- `PORT` — defaults to 3000

## Architecture

- Entrypoint `src/index.ts` starts ClickHouse, Discord, and the Hono server independently based on the toggles above
- GSI POSTs to `POST /` (root path, not under `/api`) with a `previously` field; `src/game-event.ts` diffs `previously` vs current via `recursiveDiff` and routes changed keys through `handleGameEvent`
- Web UI is a Svelte 5 app in `web/` (runes: `$state`/`$derived`; shared state in `web/src/lib/state.svelte.ts`), built to `web/dist` and served by Hono via `serveStatic` at `/` (registered after the API routes and `POST /`, which pass through). API routes mounted at `/api` (mappings), `/api/discord` (members), `/api/sounds`
- Theming: all colors live as CSS custom properties in `web/src/themes.css` (`:root[data-theme=...]` blocks); component CSS may only read `var(--token)` — no color literals (alpha variants via `color-mix`). The picker in `App.svelte` sets `data-theme` on `<html>` + `localStorage.theme`
- `src/discord.ts` keeps one `VoiceConnection` per voice channel; sounds play to all connected channels via `playSoundForAll`
- ClickHouse tables: `dota_events` (per-event rows) and `raw_requests` (full GSI payloads, filtered by an ignore-set of high-frequency keys). Inserts are batched: flush at 5000 rows or every 10s
- Slash commands live in `commands/<name>/<name>.ts` and are loaded by dynamic import at startup — after adding/renaming one, re-run `bun run registerCommands`

## Conventions

- Imports use the `@/` alias (maps to `./src/`) with explicit `.js` extensions, e.g. `import { x } from '@/clickhouse.js'`
- oxfmt style: single quotes, 120 print width, semis, trailing commas; oxlint enforces `consistent-type-imports` (use `import type`)

## Gotchas

- Voice playback requires `ffmpeg` on the host (the Dockerfile installs it; local dev needs it too)
- `utils/` is a separate Python project (uv, PEP 723 inline deps) for querying the production ClickHouse host hardcoded in `utils/clickhouse.py`, e.g. `uv run utils/clickhouse.py "SELECT ..." --key payload.previously.player`
- `mapping.json` is read once at module load in `src/game-event.ts`; runtime edits go through `setMapping` (called by the API) — don't assume the in-memory copy tracks file changes
- `src/game-event.ts` uses top-level await (Bun supports it; keep code Bun-compatible, not Node-compatible)
- Root `tsconfig.json` excludes `web/` — frontend code must not be imported from the backend (types are shared the other way: `web/` does `import type { ... } from '../../../src/types.js'`, erased at compile time)
- `$state` proxies can't pass through `structuredClone`; use `$state.snapshot()` (see `web/src/lib/state.svelte.ts`)
- `web/dist/` is a build artifact — changes there are overwritten by `bun run build:web`
