import { Hono } from 'hono';

export const modelsRoute = new Hono();

const allowedModels = (process.env.OPENAI_ALLOWED_MODELS || 'gpt-5.4-mini,gpt-5.4,gpt-5.4-nano').split(',');
const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-5.4-mini';

modelsRoute.get('/models', (c) => {
  return c.json({
    defaultModel,
    models: allowedModels.map((id) => ({
      id: id.trim(),
      label: id.trim().replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    })),
  });
});
