import { Hono } from 'hono';

import { setMapping } from '../game-event.js';
import type { MappingConfig, MappingEntry } from '../types.js';

export const mappingsRoutes = new Hono();

mappingsRoutes.get('/mappings', async (c) => {
  const f = Bun.file('mapping.json');
  const data = await f.json();
  return c.json(data);
});

mappingsRoutes.put('/mappings', async (c) => {
  const data = (await c.req.json()) as MappingConfig;
  const sorted = Object.keys(data.dota)
    .toSorted()
    .reduce(
      (acc, key) => {
        acc[key] = data.dota[key]!;
        return acc;
      },
      {} as Record<string, MappingEntry[]>,
    );
  data.dota = sorted;
  await Bun.write('mapping.json', JSON.stringify(data, null, 2));
  setMapping(data);
  return c.json({ success: true });
});

mappingsRoutes.get('/discord/user-sounds', async (c) => {
  const f = Bun.file('mapping.json');
  const data = (await f.json()) as MappingConfig;
  return c.json(data.discord?.userSounds ?? {});
});

mappingsRoutes.put('/discord/user-sounds/:userId', async (c) => {
  const userId = c.req.param('userId');
  const { sound } = (await c.req.json()) as { sound: string };
  const f = Bun.file('mapping.json');
  const data = (await f.json()) as MappingConfig;
  if (!data.discord) {
    data.discord = {};
  }
  if (!data.discord.userSounds) {
    data.discord.userSounds = {};
  }
  data.discord.userSounds[userId] = sound;
  await Bun.write('mapping.json', JSON.stringify(data, null, 2));
  return c.json({ success: true });
});

mappingsRoutes.delete('/discord/user-sounds/:userId', async (c) => {
  const userId = c.req.param('userId');
  const f = Bun.file('mapping.json');
  const data = (await f.json()) as MappingConfig;
  if (data.discord?.userSounds) {
    delete data.discord.userSounds[userId];
    if (Object.keys(data.discord.userSounds).length === 0) {
      delete data.discord.userSounds;
    }
    if (Object.keys(data.discord).length === 0) {
      delete data.discord;
    }
  }
  await Bun.write('mapping.json', JSON.stringify(data, null, 2));
  return c.json({ success: true });
});
