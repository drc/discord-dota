import { readdir } from "fs/promises";

import { connections } from "@/discord";

export const SOUNDS_DIR = "sounds/";
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function getSoundFiles(): Promise<string[]> {
  try {
    const entries = await readdir(SOUNDS_DIR);
    return entries.filter((f) => f.endsWith(".mp3") && !f.startsWith(".")).toSorted();
  } catch {
    return [];
  }
}

export const playSoundForAll = (sound: string): number => {
  const conns = Object.values(connections);
  for (const conn of conns) {
    conn.playSound(sound);
  }
  return conns.length;
};
