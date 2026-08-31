import { startClickHouse } from '@/clickhouse.js';
import { startDiscord } from '@/discord.js';
import env from '@/env.ts';
import logger from '@/logger.js';
import { startServer } from '@/server.js';

if (env.ENABLE_CLICKHOUSE) {
  startClickHouse();
}

if (env.ENABLE_DISCORD) {
  startDiscord();
}

if (env.ENABLE_SERVER) {
  startServer(env.PORT);
  logger.info(`Server running at http://localhost:${env.PORT}`);
}
