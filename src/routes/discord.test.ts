import { Hono } from "hono";
import { describe, test, expect, vi, beforeEach } from "vitest";

import { getGuildMembers } from "@/discord";
import logger from "@/logger";
import discordRoutes from "@/routes/discord";

vi.mock("@/discord", () => ({
  getGuildMembers: vi.fn(),
}));

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockedGetGuildMembers = vi.mocked(getGuildMembers);
const mockedLogger = vi.mocked(logger);

const app = new Hono().route("/api/discord", discordRoutes);

describe("discord routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns 200 with member list when getGuildMembers succeeds", async () => {
    const members = [{ id: "123", username: "testuser" }];
    mockedGetGuildMembers.mockResolvedValue(members as Awaited<ReturnType<typeof getGuildMembers>>);

    const res = await app.request("/api/discord/members");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(members);
  });

  test("returns 500 with error body when getGuildMembers throws", async () => {
    mockedGetGuildMembers.mockRejectedValue(new Error("fail"));

    const res = await app.request("/api/discord/members");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to fetch members" });
  });

  test("calls logger.error when getGuildMembers throws", async () => {
    const error = new Error("fail");
    mockedGetGuildMembers.mockRejectedValue(error);

    await app.request("/api/discord/members");

    expect(mockedLogger.error).toHaveBeenCalledWith(error, "failed to fetch guild members");
  });
});
