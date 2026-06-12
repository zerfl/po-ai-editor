import gettextParser from 'gettext-parser';
import type { GettextTranslation } from 'gettext-parser';
import type { PoEntry, PoFile, PoMetadata } from '@po-ai-editor/shared';
import { randomUUID } from 'crypto';
import { withPoCommentDefaults } from '@po-ai-editor/shared';
import { PoCatalogError } from './po-errors.js';
import { assertNoActiveObsoleteKeyOverlap, isEntryTranslated } from './po-normalizer.js';

const EMPTY_CONTEXT_SENTINEL = '__PO_AI_EDITOR_EMPTY_CONTEXT__';

function preprocessPoContent(content: string): string {
  if (content.includes(EMPTY_CONTEXT_SENTINEL)) {
    throw new PoCatalogError(
      'parse',
      'reserved-empty-context-sentinel',
      'The PO file contains a reserved empty-context sentinel value',
    );
  }

  return content
    .replace(/^#~\|/gm, '#|')
    .replace(/^(#~\s*)?msgctxt ""$/gm, (_match, prefix: string | undefined) => {
      return `${prefix ?? ''}msgctxt "${EMPTY_CONTEXT_SENTINEL}"`;
    });
}

function restoreContext(context: string | undefined, fallback: string): string | null {
  const value = context ?? fallback;
  if (value === '') return null;
  if (value === EMPTY_CONTEXT_SENTINEL) return '';
  return value;
}

function buildEntry(
  translation: GettextTranslation,
  fallbackContext: string,
  isObsolete: boolean,
): PoEntry {
  const hasPlural = Boolean(translation.msgid_plural);
  const msgstrPlural = hasPlural ? [...(translation.msgstr ?? [])] : [];
  const msgstr = hasPlural ? '' : (translation.msgstr?.[0] ?? '');
  const flags = translation.comments?.flag ?? undefined;
  const isFuzzy = flags?.split(',').some((flag) => flag.trim() === 'fuzzy') ?? false;

  return {
    id: randomUUID(),
    msgctxt: restoreContext(translation.msgctxt, fallbackContext),
    msgid: translation.msgid ?? '',
    msgidPlural: translation.msgid_plural ?? null,
    msgstr,
    msgstrPlural,
    comments: withPoCommentDefaults(translation.comments),
    isFuzzy,
    isObsolete,
    isTranslated: isEntryTranslated({ msgstr, msgstrPlural }),
  };
}

function extractEntries(
  translations: Record<string, Record<string, GettextTranslation>> | undefined,
  isObsolete: boolean,
): PoEntry[] {
  if (!translations) return [];

  const entries: PoEntry[] = [];

  for (const [context, contextEntries] of Object.entries(translations)) {
    for (const translation of Object.values(contextEntries)) {
      entries.push(buildEntry(translation, context, isObsolete));
    }
  }

  return entries;
}

function parseCatalog(
  content: string,
  filename: string,
  options: { validation: boolean; errorCode: string },
): PoFile {
  try {
    const parsed = gettextParser.po.parse(preprocessPoContent(content), {
      validation: options.validation,
    });
    const entries = [
      ...extractEntries(parsed.translations, false),
      ...extractEntries(parsed.obsolete, true),
    ];

    assertNoActiveObsoleteKeyOverlap(entries);

    const headerMap = parsed.headers ?? {};
    const knownHeaderKeys = new Set([
      'Project-Id-Version',
      'Report-Msgid-Bugs-To',
      'POT-Creation-Date',
      'PO-Revision-Date',
      'Last-Translator',
      'Language-Team',
      'Language',
      'Content-Type',
      'Content-Transfer-Encoding',
      'Plural-Forms',
      'X-Generator',
    ]);

    const extraHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headerMap)) {
      if (!knownHeaderKeys.has(key)) {
        extraHeaders[key] = value;
      }
    }

    const metadata: PoMetadata = {
      projectVersion: headerMap['Project-Id-Version'] ?? '',
      reportMsgidBugsTo: headerMap['Report-Msgid-Bugs-To'] ?? '',
      potCreationDate: headerMap['POT-Creation-Date'] ?? '',
      poRevisionDate: headerMap['PO-Revision-Date'] ?? '',
      lastTranslator: headerMap['Last-Translator'] ?? '',
      languageTeam: headerMap['Language-Team'] ?? '',
      language: headerMap['Language'] ?? '',
      contentType: headerMap['Content-Type'] ?? 'text/plain; charset=UTF-8',
      contentTransferEncoding: headerMap['Content-Transfer-Encoding'] ?? '8bit',
      pluralForms: headerMap['Plural-Forms'] ?? 'nplurals=2; plural=(n != 1);',
      xGenerator: headerMap['X-Generator'] || undefined,
      extraHeaders: Object.keys(extraHeaders).length > 0 ? extraHeaders : undefined,
    };

    return { entries, metadata, filename };
  } catch (error) {
    if (error instanceof PoCatalogError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new PoCatalogError('parse', options.errorCode, error.message, { filename });
    }

    throw error;
  }
}

export function parsePo(content: string, filename: string): PoFile {
  return parseCatalog(content, filename, { validation: true, errorCode: 'invalid-po' });
}

export function parsePot(content: string, filename: string): PoFile {
  return parseCatalog(content, filename, { validation: false, errorCode: 'invalid-pot' });
}
