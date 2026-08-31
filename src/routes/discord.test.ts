import { describe, test, expect, mock, beforeEach } from "bun:test";

import { Hono } from "hono";

interface Member {
  id: string;
  username: string;
}

const getGuildMembers = mock<() => Promise<Member[]>>();
const logger = { error: mock(), info: mock(), debug: mock() };

mock.module("@/discord", () => ({ getGuildMembers }));
mock.module("@/logger", () => ({ default: logger }));

const { default: discordRoutes } = await import("@/routes/discord");

const app = new Hono().route("/api/discord", discordRoutes);

describe("discord routes", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  test("returns 200 with member list when getGuildMembers succeeds", async () => {
    const members = [{ id: "123", username: "testuser" }];
    getGuildMembers.mockResolvedValue(members);

    const res = await app.request("/api/discord/members");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(members);
  });

  test("returns 500 with error body when getGuildMembers throws", async () => {
    getGuildMembers.mockRejectedValue(new Error("fail"));

    const res = await app.request("/api/discord/members");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to fetch members" });
  });

  test("calls logger.error when getGuildMembers throws", async () => {
    const error = new Error("fail");
    getGuildMembers.mockRejectedValue(error);

    await app.request("/api/discord/members");

    expect(logger.error).toHaveBeenCalledWith(error, "failed to fetch guild members");
  });
});
