export type Formality = 'auto' | 'formal' | 'informal';
export type Tone = 'auto' | 'friendly' | 'technical' | 'neutral';

export interface TranslationStyle {
  formality: Formality;
  tone: Tone;
}

export type ContextMode = 'style-sample' | 'full-context' | 'minimal';

export interface TranslationContext {
  mode: ContextMode;
  existingTranslations: Array<{
    msgid: string;
    msgstr: string;
  }>;
}
