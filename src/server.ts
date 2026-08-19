import { Hono } from 'hono';

import { logRawRequest } from '@/clickhouse.js';
import { recursiveDiff } from '@/game-event.js';
import logger from '@/logger.js';
import discordRoutes from '@/routes/discord.js';
import mappingsRoutes from '@/routes/mappings.js';
import soundsRoutes from '@/routes/sounds.js';
import type { GameEventContext } from '@/types.js';

export const app = new Hono();

app.use('*', async (c, next) => {
  const start = performance.now();
  const { method, path: route } = c.req;

  try {
    await next();
  } finally {
    const duration = performance.now() - start;
    logger.debug({ method, route, status: c.res.status, duration: Math.round(duration) }, 'request completed');
  }
});

app.route('/api', mappingsRoutes);
app.route('/api/discord', discordRoutes);
app.route('/api/sounds', soundsRoutes);

app.get('/favicon.png', async (c) => {
  const file = Bun.file('./public/favicon.png');
  return c.body(file.stream(), {
    headers: { 'Content-Type': 'image/png' },
  });
});

app.get('/', async (c) => {
  const file = Bun.file('./public/index.html');
  return c.html(await file.text());
});

app.post('/', async (c) => {
  const payload = await c.req.json();
  if (payload.previously) {
    const ctx: GameEventContext = {
      accountID: payload.player.accountid,
      matchID: payload.map.matchid,
      gameTime: payload.map.game_time,
      timestamp: payload.provider.timestamp * 1000,
    };

    recursiveDiff('', payload.previously, payload, ctx);

    await logRawRequest(payload);
  }
  return c.text('OK', 200);
});

export function startServer(port = 3000): void {
  logger.info(`Hono server starting on port ${port}`);
  Bun.serve({
    fetch: app.fetch,
    port,
  });
}
