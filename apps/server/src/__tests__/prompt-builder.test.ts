import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from '../services/prompt-builder';
import type { TranslateRequest } from '@po-ai-editor/shared';

const sampleRequest: TranslateRequest = {
  model: 'gpt-5.4-mini',
  sourceLanguage: 'English',
  targetLanguage: 'German',
  style: { formality: 'formal', tone: 'technical' },
  customInstructions: 'Use formal German',
  glossary: [
    { source: 'Settings', target: 'Einstellungen', note: 'UI term' },
  ],
  context: {
    mode: 'style-sample',
    existingTranslations: [
      { msgid: 'Save', msgstr: 'Speichern' },
    ],
  },
  entries: [
    {
      id: '1',
      msgctxt: null,
      msgid: 'Save changes',
      msgidPlural: null,
      comments: [],
      references: ['src/settings.tsx:42'],
      flags: [],
    },
  ],
};

describe('prompt-builder', () => {
  it('should build system prompt with language info', () => {
    const prompt = buildSystemPrompt(sampleRequest);
    expect(prompt).toContain('Source language: English');
    expect(prompt).toContain('Target language: German');
  });

  it('should include formality and tone', () => {
    const prompt = buildSystemPrompt(sampleRequest);
    expect(prompt).toContain('Formality: formal');
    expect(prompt).toContain('Tone: technical');
  });

  it('should include glossary terms', () => {
    const prompt = buildSystemPrompt(sampleRequest);
    expect(prompt).toContain('"Settings" → "Einstellungen"');
  });

  it('should include custom instructions', () => {
    const prompt = buildSystemPrompt(sampleRequest);
    expect(prompt).toContain('Use formal German');
  });

  it('should build user prompt with entries', () => {
    const prompt = buildUserPrompt(sampleRequest);
    expect(prompt).toContain('Save changes');
  });

  it('should include existing translations', () => {
    const prompt = buildUserPrompt(sampleRequest);
    expect(prompt).toContain('"Save" → "Speichern"');
  });
});
