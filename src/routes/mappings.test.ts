import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Hono } from 'hono';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

import { setMapping } from '@/game-event.js';
import mappingsRoutes from '@/routes/mappings.js';

vi.mock('@/game-event.js', () => ({ setMapping: vi.fn() }));
vi.mock('@/logger.js', () => ({
  default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const app = new Hono().route('/api', mappingsRoutes);

const defaultMapping = { dota: {}, discord: { userSounds: {} } };

let originalCwd = process.cwd();
let tmpDir = '';

function installBunMock() {
  const bun = {
    file(path: string) {
      return {
        async json() {
          return JSON.parse(readFileSync(join(process.cwd(), path), 'utf8'));
        },
      };
    },
    async write(path: string, data: string) {
      writeFileSync(join(process.cwd(), path), data);
    },
  };
  vi.stubGlobal('Bun', bun);
}

beforeEach(() => {
  originalCwd = process.cwd();
  tmpDir = mkdtempSync(join(tmpdir(), 'dota-test-'));
  process.chdir(tmpDir);
  writeFileSync('mapping.json', JSON.stringify(defaultMapping, null, 2));
  installBunMock();
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

function readMapping() {
  return JSON.parse(readFileSync(join(process.cwd(), 'mapping.json'), 'utf8'));
}

describe('mappings routes', () => {
  describe('GET /mappings', () => {
    test('returns 200 with mapping JSON body', async () => {
      const res = await app.request('/api/mappings');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(defaultMapping);
    });

    test('returns empty dota when file has no entries', async () => {
      const res = await app.request('/api/mappings');
      const body = (await res.json()) as { dota: Record<string, unknown> };
      expect(body.dota).toEqual({});
    });
  });

  describe('PUT /mappings', () => {
    test('writes data to file and calls setMapping', async () => {
      const payload = {
        dota: { kill: [{ sound: 'kill.mp3', condition: '*', value: 1 }] },
      };
      const res = await app.request('/api/mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ success: true });
      expect(setMapping).toHaveBeenCalledWith(expect.objectContaining({ dota: payload.dota }));
      const onDisk = readMapping() as Record<string, any>;
      expect(onDisk.dota.kill).toEqual(payload.dota.kill);
    });

    test('sorts dota keys alphabetically', async () => {
      const payload = {
        dota: {
          zevent: [{ sound: 'z.mp3', condition: '*', value: 1 }],
          aevent: [{ sound: 'a.mp3', condition: '*', value: 1 }],
          mevent: [{ sound: 'm.mp3', condition: '*', value: 1 }],
        },
      };
      await app.request('/api/mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const onDisk = readMapping() as Record<string, any>;
      expect(Object.keys(onDisk.dota)).toEqual(['aevent', 'mevent', 'zevent']);
    });
  });

  describe('GET /discord/user-sounds', () => {
    test('returns userSounds object', async () => {
      const mapping = { dota: {}, discord: { userSounds: { user1: 'hello.mp3' } } };
      writeFileSync('mapping.json', JSON.stringify(mapping, null, 2));
      const res = await app.request('/api/discord/user-sounds');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ user1: 'hello.mp3' });
    });

    test('returns empty object when discord key is missing', async () => {
      writeFileSync('mapping.json', JSON.stringify({ dota: {} }, null, 2));
      const res = await app.request('/api/discord/user-sounds');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({});
    });
  });

  describe('PUT /discord/user-sounds/:userId', () => {
    test('creates new user sound entry in file', async () => {
      const res = await app.request('/api/discord/user-sounds/user42', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sound: 'boom.mp3' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ success: true });
      const onDisk = readMapping() as Record<string, any>;
      expect(onDisk.discord.userSounds.user42).toBe('boom.mp3');
    });

    test('overwrites existing user sound entry', async () => {
      const mapping = { dota: {}, discord: { userSounds: { user42: 'old.mp3' } } };
      writeFileSync('mapping.json', JSON.stringify(mapping, null, 2));
      await app.request('/api/discord/user-sounds/user42', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sound: 'new.mp3' }),
      });
      const onDisk = readMapping() as Record<string, any>;
      expect(onDisk.discord.userSounds.user42).toBe('new.mp3');
    });
  });

  describe('DELETE /discord/user-sounds/:userId', () => {
    test('removes user sound entry from file', async () => {
      const mapping = { dota: {}, discord: { userSounds: { user42: 'boom.mp3', user99: 'hey.mp3' } } };
      writeFileSync('mapping.json', JSON.stringify(mapping, null, 2));
      const res = await app.request('/api/discord/user-sounds/user42', { method: 'DELETE' });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ success: true });
      const onDisk = readMapping() as Record<string, any>;
      expect(onDisk.discord.userSounds.user42).toBeUndefined();
      expect(onDisk.discord.userSounds.user99).toBe('hey.mp3');
    });

    test('cleans up empty parent objects', async () => {
      const mapping = { dota: {}, discord: { userSounds: { user42: 'boom.mp3' } } };
      writeFileSync('mapping.json', JSON.stringify(mapping, null, 2));
      await app.request('/api/discord/user-sounds/user42', { method: 'DELETE' });
      const onDisk = readMapping() as Record<string, any>;
      expect(onDisk.discord).toBeUndefined();
    });

    test('returns success for non-existent user (idempotent)', async () => {
      const res = await app.request('/api/discord/user-sounds/nobody', { method: 'DELETE' });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ success: true });
    });
  });
});
