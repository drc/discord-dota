import { Hono } from 'hono';

import { getSoundFiles, playSoundForAll, SOUNDS_DIR, MAX_FILE_SIZE } from '@/sounds.js';

const soundsRoutes = new Hono();

soundsRoutes.get('/', async (c) => {
  const sounds = await getSoundFiles();
  return c.json(sounds);
});

soundsRoutes.get('/:name', async (c) => {
  const name = c.req.param('name');
  const allowed = await getSoundFiles();
  if (!allowed.includes(name)) {
    return c.text('Not found', 404);
  }
  const file = Bun.file(SOUNDS_DIR + name);
  return c.body(file.stream(), {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `inline; filename="${name}"`,
    },
  });
});

soundsRoutes.post('/:name/play', async (c) => {
  const name = c.req.param('name');
  const allowed = await getSoundFiles();
  if (!allowed.includes(name)) {
    return c.text('Sound not found', 404);
  }
  playSoundForAll(name);
  return c.json({ success: true });
});

soundsRoutes.post('/', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof File)) {
    return c.text('No file provided', 400);
  }
  if (!file.name.toLowerCase().endsWith('.mp3')) {
    return c.text('Only MP3 files allowed', 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    return c.text('File too large (max 10MB)', 400);
  }
  const name = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (name.startsWith('.')) {
    return c.text('Hidden files not allowed', 400);
  }
  const dest = Bun.file(SOUNDS_DIR + name);
  await Bun.write(dest, file);
  return c.json({ success: true, name });
});

soundsRoutes.delete('/:name', async (c) => {
  const name = c.req.param('name');
  const allowed = await getSoundFiles();
  if (!allowed.includes(name)) {
    return c.text('Not found', 404);
  }
  const file = Bun.file(SOUNDS_DIR + name);
  await file.delete();
  return c.json({ success: true });
});

export default soundsRoutes;
