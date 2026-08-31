import { Hono } from "hono";

import { getGuildMembers } from "@/discord";
import logger from "@/logger";

const discordRoutes = new Hono();

discordRoutes.get("/members", async (c) => {
  try {
    const members = await getGuildMembers();
    return c.json(members);
  } catch (error) {
    logger.error(error, "failed to fetch guild members");
    return c.json({ error: "Failed to fetch members" }, 500);
  }
});

export default discordRoutes;
