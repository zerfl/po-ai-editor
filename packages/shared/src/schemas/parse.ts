import { z } from 'zod';

export const ParseRequestSchema = z.object({
  content: z.string(),
  filename: z.string(),
});

export const PoCommentSchema = z.object({
  translator: z.string().optional(),
  extracted: z.string().optional(),
  reference: z.string().optional(),
  flag: z.string().optional(),
});

export const PoEntrySchema = z.object({
  id: z.string(),
  msgctxt: z.string().nullable(),
  msgid: z.string(),
  msgidPlural: z.string().nullable(),
  msgstr: z.string(),
  msgstrPlural: z.array(z.string()),
  comments: PoCommentSchema,
  isFuzzy: z.boolean(),
  isObsolete: z.boolean(),
  isTranslated: z.boolean(),
});

export const PoMetadataSchema = z.object({
  projectVersion: z.string(),
  reportMsgidBugsTo: z.string(),
  potCreationDate: z.string(),
  poRevisionDate: z.string(),
  lastTranslator: z.string(),
  languageTeam: z.string(),
  language: z.string(),
  contentType: z.string(),
  contentTransferEncoding: z.string(),
  pluralForms: z.string(),
});

export const ParseResponseSchema = z.object({
  entries: z.array(PoEntrySchema),
  metadata: PoMetadataSchema,
  filename: z.string(),
});

export type ParseRequest = z.infer<typeof ParseRequestSchema>;
export type ParseResponse = z.infer<typeof ParseResponseSchema>;
