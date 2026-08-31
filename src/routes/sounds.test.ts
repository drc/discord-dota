import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Hono } from "hono";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

import soundsRoutes from "@/routes/sounds";

const { mockPlaySoundForAll } = vi.hoisted(() => ({
  mockPlaySoundForAll: vi.fn(),
}));

vi.mock("@/discord", () => ({ connections: {} }));
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock("@/sounds", async () => {
  const actual = await vi.importActual("@/sounds");
  return { ...actual, playSoundForAll: mockPlaySoundForAll };
});

describe("sounds routes", () => {
  const app = new Hono().route("/api/sounds", soundsRoutes);
  let originalCwd = "";
  let tmpDir = "";

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = mkdtempSync(join(tmpdir(), "dota-sounds-test-"));
    process.chdir(tmpDir);
    mkdirSync("sounds");
    writeFileSync("sounds/test.mp3", "fake-mp3-data");
    writeFileSync("sounds/kill.mp3", "fake-mp3-data");
    vi.clearAllMocks();

    const streams = new Map<string, ReadableStream>();
    (globalThis as any).Bun = {
      file: (path: string) => {
        const { existsSync, readFileSync, statSync } = require("node:fs");
        return {
          path,
          size: existsSync(path) ? statSync(path).size : 0,
          stream: () => {
            if (!streams.has(path)) {
              const data = existsSync(path) ? readFileSync(path) : Buffer.alloc(0);
              streams.set(
                path,
                new ReadableStream({
                  start(controller) {
                    controller.enqueue(data);
                    controller.close();
                  },
                }),
              );
            }
            return streams.get(path)!;
          },
          delete: async () => {
            const { unlinkSync } = require("node:fs");
            if (existsSync(path)) {
              unlinkSync(path);
            }
          },
        };
      },
      write: async (dest: any, data: any) => {
        const filePath = dest?.path ?? dest;
        if (data instanceof Blob || data instanceof File) {
          const buffer = Buffer.from(await data.arrayBuffer());
          writeFileSync(filePath, buffer);
        } else {
          writeFileSync(filePath, data);
        }
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).Bun;
    process.chdir(originalCwd);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("GET /", () => {
    test("returns 200 with list of sound files", async () => {
      const res = await app.request("/api/sounds");
      expect(res.status).toBe(200);
      const body = (await res.json()) as string[];
      expect(body).toContain("test.mp3");
      expect(body).toContain("kill.mp3");
    });

    test("returns empty array when sounds directory has no mp3 files", async () => {
      rmSync("sounds/test.mp3");
      rmSync("sounds/kill.mp3");
      const res = await app.request("/api/sounds");
      expect(res.status).toBe(200);
      const body = (await res.json()) as string[];
      expect(body).toEqual([]);
    });
  });

  describe("GET /:name", () => {
    test("returns 200 with audio/mpeg content-type for existing sound", async () => {
      const res = await app.request("/api/sounds/test.mp3");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
    });

    test("returns 404 for non-existent sound name", async () => {
      const res = await app.request("/api/sounds/nope.mp3");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /:name/play", () => {
    test("returns 200 and calls playSoundForAll for existing sound", async () => {
      const res = await app.request("/api/sounds/test.mp3/play", { method: "POST" });
      expect(res.status).toBe(200);
      expect(mockPlaySoundForAll).toHaveBeenCalledWith("test.mp3");
    });

    test("returns 404 for non-existent sound name", async () => {
      const res = await app.request("/api/sounds/nope.mp3/play", { method: "POST" });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /", () => {
    test("uploads a valid mp3 file", async () => {
      const formData = new FormData();
      const blob = new Blob(["fake-audio-data"], { type: "audio/mpeg" });
      const file = new File([blob], "upload.mp3", { type: "audio/mpeg" });
      formData.append("file", file);

      const res = await app.request("/api/sounds", { method: "POST", body: formData });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; name: string };
      expect(body.success).toBe(true);
      expect(body.name).toBe("upload.mp3");
    });

    test("returns 400 when no file field in FormData", async () => {
      const formData = new FormData();
      const res = await app.request("/api/sounds", { method: "POST", body: formData });
      expect(res.status).toBe(400);
    });

    test("returns 400 for non-mp3 file", async () => {
      const formData = new FormData();
      const blob = new Blob(["text"], { type: "text/plain" });
      const file = new File([blob], "readme.txt", { type: "text/plain" });
      formData.append("file", file);

      const res = await app.request("/api/sounds", { method: "POST", body: formData });
      expect(res.status).toBe(400);
    });

    test("returns 400 for hidden files", async () => {
      const formData = new FormData();
      const blob = new Blob(["data"], { type: "audio/mpeg" });
      const file = new File([blob], ".hidden.mp3", { type: "audio/mpeg" });
      formData.append("file", file);

      const res = await app.request("/api/sounds", { method: "POST", body: formData });
      expect(res.status).toBe(400);
    });

    test("sanitizes filename", async () => {
      const formData = new FormData();
      const blob = new Blob(["fake-audio-data"], { type: "audio/mpeg" });
      const file = new File([blob], "my sound!@#.mp3", { type: "audio/mpeg" });
      formData.append("file", file);

      const res = await app.request("/api/sounds", { method: "POST", body: formData });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; name: string };
      expect(body.name).toBe("my_sound___.mp3");
    });
  });

  describe("DELETE /:name", () => {
    test("deletes a sound file from disk", async () => {
      const res = await app.request("/api/sounds/test.mp3", { method: "DELETE" });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean };
      expect(body.success).toBe(true);

      const listRes = await app.request("/api/sounds");
      const files = (await listRes.json()) as string[];
      expect(files).not.toContain("test.mp3");
    });

    test("returns 404 for non-existent sound", async () => {
      const res = await app.request("/api/sounds/nope.mp3", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });
});
