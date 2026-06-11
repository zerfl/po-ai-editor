import { Hono } from 'hono';
import { z } from 'zod';
import { parsePo, parsePot } from '../services/po-parser.js';

const ParseRequestSchema = z.object({
  content: z.string().min(1),
  filename: z.string().min(1),
});

export const parseRoute = new Hono();

parseRoute.post('/parse', async (c) => {
  try {
    const body: unknown = await c.req.json();
    const result = ParseRequestSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Invalid request', details: result.error.flatten() }, 400);
    }

    const { content, filename } = result.data;
    const isPot = filename.endsWith('.pot');
    const poFile = isPot ? parsePot(content, filename) : parsePo(content, filename);

    return c.json(poFile);
  } catch (error) {
    console.error('Parse error:', error);
    return c.json({ error: 'Failed to parse file' }, 500);
  }
});
