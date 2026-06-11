import { z } from 'zod';

export const GlossaryTermSchema = z.object({
  source: z.string(),
  target: z.string(),
  note: z.string().optional(),
});

export const TranslationStyleSchema = z.object({
  formality: z.enum(['auto', 'formal', 'informal']),
  tone: z.enum(['auto', 'friendly', 'technical', 'neutral']),
});

export const TranslationContextSchema = z.object({
  mode: z.enum(['style-sample', 'full-context', 'minimal']),
  existingTranslations: z.array(
    z.object({
      msgid: z.string(),
      msgstr: z.string(),
    }),
  ),
});

export const TranslateEntrySchema = z.object({
  id: z.string(),
  msgctxt: z.string().nullable(),
  msgid: z.string(),
  msgidPlural: z.string().nullable(),
  comments: z.array(z.string()),
  references: z.array(z.string()),
  flags: z.array(z.string()),
});

export const TranslateRequestSchema = z.object({
  model: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  style: TranslationStyleSchema,
  customInstructions: z.string(),
  glossary: z.array(GlossaryTermSchema),
  context: TranslationContextSchema,
  entries: z.array(TranslateEntrySchema),
});

export const TranslationSuggestionSchema = z.object({
  id: z.string(),
  msgstr: z.string(),
  plural: z.array(z.string()).nullable(),
  needsReview: z.boolean(),
  notes: z.array(z.string()),
});

export const TranslateResponseSchema = z.object({
  suggestions: z.array(TranslationSuggestionSchema),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
  }),
});

export type TranslateRequest = z.infer<typeof TranslateRequestSchema>;
export type TranslateResponse = z.infer<typeof TranslateResponseSchema>;
export type TranslationSuggestion = z.infer<typeof TranslationSuggestionSchema>;
