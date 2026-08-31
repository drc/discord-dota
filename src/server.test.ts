import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

import { logRawRequest } from '@/clickhouse.js';
import { recursiveDiff } from '@/game-event.js';
import { app } from '@/server.js';

vi.mock('@/clickhouse.js', () => ({
  logRawRequest: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock('@/game-event.js', () => ({
  recursiveDiff: vi.fn(),
  setMapping: vi.fn(),
  handleGameEvent: vi.fn(),
}));

vi.mock('@/discord.js', () => ({
  getGuildMembers: vi.fn(),
  connections: {},
  client: {},
}));

vi.mock('@/logger.js', () => ({
  default: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

let originalCwd = '';
let tmpDir = '';

vi.hoisted(() => {
  Object.assign(globalThis, { Bun: {} });
});

beforeEach(() => {
  vi.stubGlobal('Bun', {
    file(path: string) {
      const abs = join(process.cwd(), path);
      const blob = new Blob([readFileSync(abs)]);
      return Object.assign(blob, {
        exists: async () => true,
      });
    },
  });

  originalCwd = process.cwd();
  tmpDir = mkdtempSync(join(tmpdir(), 'dota-test-'));
  process.chdir(tmpDir);
  mkdirSync('web/dist', { recursive: true });
  writeFileSync('web/dist/index.html', '<html></html>');
  writeFileSync('web/dist/favicon.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  writeFileSync('mapping.json', JSON.stringify({ dota: {}, discord: { userSounds: {} } }));
  mkdirSync('sounds', { recursive: true });
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(tmpDir, { recursive: true, force: true });
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('server routes', () => {
  test('GET / returns 200 with HTML content', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe('<html></html>');
  });

  test('GET /favicon.png returns 200 with image/png content-type', async () => {
    const res = await app.request('/favicon.png');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
  });

  describe('POST / (GSI webhook)', () => {
    test('processes payload when previously is present', async () => {
      const payload = {
        previously: { map: { game_time: 100 } },
        player: { accountid: 123 },
        map: { matchid: 456, game_time: 200 },
        provider: { timestamp: 1000 },
      };
      await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(recursiveDiff).toHaveBeenCalledWith('', payload.previously, payload, {
        accountID: 123,
        matchID: 456,
        gameTime: 200,
        timestamp: 1_000_000,
      });
    });

    test('calls logRawRequest with full payload when previously is present', async () => {
      const payload = {
        previously: { map: { game_time: 100 } },
        player: { accountid: 123 },
        map: { matchid: 456, game_time: 200 },
        provider: { timestamp: 1000 },
      };
      await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(logRawRequest).toHaveBeenCalledWith(payload);
    });

    test('does not call recursiveDiff when previously is absent', async () => {
      const payload = { player: { accountid: 123 }, map: {} };
      await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(recursiveDiff).not.toHaveBeenCalled();
    });

    test('does not call logRawRequest when previously is absent', async () => {
      const payload = { player: { accountid: 123 }, map: {} };
      await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(logRawRequest).not.toHaveBeenCalled();
    });

    test('returns 200 with OK body when previously is present', async () => {
      const payload = {
        previously: { map: { game_time: 100 } },
        player: { accountid: 123 },
        map: { matchid: 456, game_time: 200 },
        provider: { timestamp: 1000 },
      };
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('OK');
    });

    test('returns 200 with OK body when previously is absent', async () => {
      const payload = { player: { accountid: 123 }, map: {} };
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('OK');
    });
  });
});
