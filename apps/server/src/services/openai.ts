import OpenAI from 'openai';

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export async function callTranslation(
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const choice = response.choices[0];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: empty array guard
  if (!choice?.message.content) {
    throw new Error('Empty response from OpenAI');
  }

  return {
    content: choice.message.content,
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}
