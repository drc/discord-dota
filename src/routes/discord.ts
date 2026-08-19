import { Hono } from 'hono';

import { getGuildMembers } from '../discord.js';
import logger from '../logger.js';

const discordRoutes = new Hono();

discordRoutes.get('/discord/members', async (c) => {
  try {
    const members = await getGuildMembers();
    return c.json(members);
  } catch (error) {
    logger.error(error, 'failed to fetch guild members');
    return c.json({ error: 'Failed to fetch members' }, 500);
  }
});

export default discordRoutes;
