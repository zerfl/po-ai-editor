import { z } from 'zod';

export const ModelInfoSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const ModelsResponseSchema = z.object({
  defaultModel: z.string(),
  models: z.array(ModelInfoSchema),
});

export type ModelsResponse = z.infer<typeof ModelsResponseSchema>;
