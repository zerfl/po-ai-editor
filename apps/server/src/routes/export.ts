import { Hono } from 'hono';
import { z } from 'zod';
import { serializePo, serializeMo } from '../services/po-serializer.js';
import { PoEntrySchema, PoMetadataSchema } from '@po-ai-editor/shared';

const ExportRequestSchema = z.object({
  entries: z.array(PoEntrySchema),
  metadata: PoMetadataSchema,
});

export const exportRoute = new Hono();

exportRoute.post('/export/po', async (c) => {
  try {
    const body = await c.req.json();
    const result = ExportRequestSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Invalid request', details: result.error.flatten() }, 400);
    }

    const { entries, metadata } = result.data;
    const poContent = serializePo(entries, metadata);

    c.header('Content-Type', 'text/plain; charset=utf-8');
    c.header('Content-Disposition', 'attachment; filename="translation.po"');
    return c.body(poContent);
  } catch (error) {
    console.error('Export PO error:', error);
    return c.json({ error: 'Export failed' }, 500);
  }
});

exportRoute.post('/export/mo', async (c) => {
  try {
    const body = await c.req.json();
    const result = ExportRequestSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Invalid request', details: result.error.flatten() }, 400);
    }

    const { entries, metadata } = result.data;
    const moContent = serializeMo(entries, metadata);

    c.header('Content-Type', 'application/x-mobipocket-ebook');
    c.header('Content-Disposition', 'attachment; filename="translation.mo"');
    return c.body(moContent);
  } catch (error) {
    console.error('Export MO error:', error);
    return c.json({ error: 'Export failed' }, 500);
  }
});
