import type { TranslateRequest } from '@po-ai-editor/shared';

export function buildSystemPrompt(request: TranslateRequest): string {
  const parts: string[] = [];

  parts.push(
    'You are a professional software translator specializing in gettext/PO file translations.',
  );
  parts.push('');
  parts.push(`Source language: ${request.sourceLanguage}`);
  parts.push(`Target language: ${request.targetLanguage}`);

  if (request.style.formality !== 'auto') {
    parts.push(`Formality: ${request.style.formality}`);
  }
  if (request.style.tone !== 'auto') {
    parts.push(`Tone: ${request.style.tone}`);
  }

  parts.push('');
  parts.push('RULES:');
  parts.push(
    '1. Preserve all placeholders exactly as they appear (e.g., %s, %d, {name}, {{variable}}, %%).',
  );
  parts.push('2. Preserve HTML tags and their attributes.');
  parts.push('3. Preserve line breaks (\\n) in the same positions.');
  parts.push(
    '4. For plural forms, provide appropriate translations for each plural form required by the target language.',
  );
  parts.push(
    '5. Mark entries as needing review if: the translation is uncertain, placeholders are complex, or context is ambiguous.',
  );
  parts.push(
    '6. Do NOT translate: URLs, file paths, variable names, command-line arguments, or proper nouns.',
  );
  parts.push('7. Return valid JSON matching the specified output schema.');

  if (request.glossary.length > 0) {
    parts.push('');
    parts.push('GLOSSARY (use these exact translations):');
    for (const term of request.glossary) {
      parts.push(`  "${term.source}" → "${term.target}"`);
      if (term.note) {
        parts.push(`    Note: ${term.note}`);
      }
    }
  }

  if (request.customInstructions) {
    parts.push('');
    parts.push('CUSTOM INSTRUCTIONS:');
    parts.push(request.customInstructions);
  }

  parts.push('');
  parts.push(
    'OUTPUT FORMAT: Return a JSON object with a "suggestions" array. Each item must have:',
  );
  parts.push('- "id": the entry ID');
  parts.push('- "msgstr": the translated string');
  parts.push('- "plural": array of plural translations (or null if not plural)');
  parts.push('- "needsReview": boolean');
  parts.push('- "notes": array of translation notes');

  return parts.join('\n');
}

export function buildUserPrompt(request: TranslateRequest): string {
  const parts: string[] = [];

  if (request.context.existingTranslations.length > 0) {
    parts.push('EXISTING TRANSLATIONS (for style reference):');
    for (const t of request.context.existingTranslations.slice(0, 10)) {
      parts.push(`  "${t.msgid}" → "${t.msgstr}"`);
    }
    parts.push('');
  }

  parts.push('ENTRIES TO TRANSLATE:');
  parts.push(JSON.stringify(request.entries, null, 2));

  return parts.join('\n');
}
