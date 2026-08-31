# AGENTS.md

Discord bot for DOTA2 Game State Integration (GSI): Hono HTTP server receives GSI payloads, triggers Discord voice soundboard clips, posts post-game match links, and logs events to ClickHouse. Bun + TypeScript, no build step (runs TS directly).

## Commands

- `bun run dev` — run with `.env` loaded and `--watch` (auto-reload). One-shot without watch: `bun --env-file=.env src/index.ts`
- `bun run typecheck` — `tsc --noEmit`
- `bun run lint` / `bun run lint:fix` — oxlint
- `bun run fmt` / `bun run fmt:check` — oxfmt
- `bun run registerCommands` — registers slash commands; requires a root `config.json` with `{ token, clientId, guildId }` (not `.env`)
- `bun test` — run the bun:test suite (`src/**/*.test.ts`); `bun run test:watch` for watch mode

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
- Web UI is static: `public/index.html` served at `/`; API routes mounted at `/api` (mappings), `/api/discord` (members), `/api/sounds`
- `src/discord.ts` keeps one `VoiceConnection` per voice channel; sounds play to all connected channels via `playSoundForAll`
- ClickHouse tables: `dota_events` (per-event rows) and `raw_requests` (full GSI payloads, filtered by an ignore-set of high-frequency keys). Inserts are batched: flush at 5000 rows or every 10s
- Slash commands live in `commands/<name>/<name>.ts` and are loaded by dynamic import at startup — after adding/renaming one, re-run `bun run registerCommands`

## Conventions

- Imports use the `@/` alias (maps to `./src/`) with no file extension, e.g. `import { x } from '@/clickhouse'`
- oxfmt style: double quotes, 120 print width, semis, trailing commas; oxlint enforces `consistent-type-imports` (use `import type`)

## Gotchas

- Voice playback requires `ffmpeg` on the host (the Dockerfile installs it; local dev needs it too)
- `utils/` is a separate Python project (uv, PEP 723 inline deps) for querying the production ClickHouse host hardcoded in `utils/clickhouse.py`, e.g. `uv run utils/clickhouse.py "SELECT ..." --key payload.previously.player`
- `mapping.json` is read once at module load in `src/game-event.ts`; runtime edits go through `setMapping` (called by the API) — don't assume the in-memory copy tracks file changes
- `src/game-event.ts` uses top-level await (Bun supports it; keep code Bun-compatible, not Node-compatible)
