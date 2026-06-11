import { Hono } from 'hono';
import { TranslateRequestSchema } from '@po-ai-editor/shared';
import { callTranslation } from '../services/openai.js';
import { buildSystemPrompt, buildUserPrompt } from '../services/prompt-builder.js';

export const translateRoute = new Hono();

translateRoute.post('/translate', async (c) => {
  try {
    const body: unknown = await c.req.json();
    const result = TranslateRequestSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Invalid request', details: result.error.flatten() }, 400);
    }

    const request = result.data;
    const systemPrompt = buildSystemPrompt(request);
    const userPrompt = buildUserPrompt(request);

    const response = await callTranslation(request.model, systemPrompt, userPrompt);

    const parsed: unknown = JSON.parse(response.content);

    return c.json({
      suggestions:
        typeof parsed === 'object' && parsed !== null && 'suggestions' in parsed
          ? (parsed.suggestions ?? [])
          : [],
      usage: response.usage,
    });
  } catch (error) {
    console.error('Translation error:', error);
    return c.json({ error: 'Translation failed' }, 500);
  }
});
