import { Hono } from 'hono';
import { TranslateRequestSchema } from '@po-ai-editor/shared';
import { callTranslation } from '../services/openai.js';
import { buildSystemPrompt, buildUserPrompt } from '../services/prompt-builder.js';

export const translateRoute = new Hono();

translateRoute.post('/translate', async (c) => {
  try {
    const body = await c.req.json();
    const result = TranslateRequestSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Invalid request', details: result.error.flatten() }, 400);
    }

    const request = result.data;
    const systemPrompt = buildSystemPrompt(request);
    const userPrompt = buildUserPrompt(request);

    const response = await callTranslation(request.model, systemPrompt, userPrompt);

    let parsed;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      return c.json({ error: 'Failed to parse AI response' }, 500);
    }

    return c.json({
      suggestions: parsed.suggestions || [],
      usage: response.usage,
    });
  } catch (error) {
    console.error('Translation error:', error);
    return c.json({ error: 'Translation failed' }, 500);
  }
});
