import { z } from 'zod';
import { PoEntrySchema, PoMetadataSchema } from './parse.js';

export const ExportRequestSchema = z.object({
  entries: z.array(PoEntrySchema),
  metadata: PoMetadataSchema,
});

export type ExportRequest = z.infer<typeof ExportRequestSchema>;
