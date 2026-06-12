import gettextParser from 'gettext-parser';
import type { PoEntry, PoMetadata } from '@po-ai-editor/shared';
import { splitFlagComment } from '@po-ai-editor/shared';
import { normalizePoEntries } from './po-normalizer.js';
import { PoCatalogError } from './po-errors.js';

const APP_GENERATOR = 'PO AI Editor';
const PO_WRAP_WIDTH = 76;
const VALIDATION_EMPTY_CONTEXT_SENTINEL = '__PO_AI_EDITOR_EMPTY_CONTEXT_VALIDATION__';

export interface SerializeOptions {
  updateRevisionDate?: boolean;
}

function escapeForPo(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

function wrapPoString(escaped: string): string[] {
  if (escaped.length <= PO_WRAP_WIDTH) {
    return [`"${escaped}"`];
  }

  const parts: string[] = [];
  let remaining = escaped;

  while (remaining.length > 0) {
    if (remaining.length <= PO_WRAP_WIDTH) {
      parts.push(`"${remaining}"`);
      break;
    }

    let splitAt = -1;

    const newlinePos = remaining.lastIndexOf('\\n', PO_WRAP_WIDTH);
    if (newlinePos >= 0 && newlinePos + 2 <= PO_WRAP_WIDTH) {
      splitAt = newlinePos + 2;
    }

    if (splitAt < 0) {
      const spacePos = remaining.lastIndexOf(' ', PO_WRAP_WIDTH);
      if (spacePos > 0) {
        splitAt = spacePos + 1;
      }
    }

    if (splitAt < 0) {
      splitAt = PO_WRAP_WIDTH;
    }

    parts.push(`"${remaining.slice(0, splitAt)}"`);
    remaining = remaining.slice(splitAt);
  }

  return parts;
}

function emitPoField(lines: string[], keyword: string, escaped: string): void {
  const wrapped = wrapPoString(escaped);
  if (wrapped.length === 1) {
    lines.push(`${keyword} ${wrapped[0]}`);
  } else {
    lines.push(`${keyword} ${wrapped[0]}`);
    for (let i = 1; i < wrapped.length; i++) {
      lines.push(wrapped[i]);
    }
  }
}

function emitPoFieldWithPrefix(
  lines: string[],
  keyword: string,
  escaped: string,
  prefix: string | null,
): void {
  if (!prefix) {
    emitPoField(lines, keyword, escaped);
    return;
  }

  const wrapped = wrapPoString(escaped);
  if (wrapped.length === 1) {
    lines.push(`${prefix}${keyword} ${wrapped[0]}`);
    return;
  }

  lines.push(`${prefix}${keyword} ${wrapped[0]}`);
  for (let index = 1; index < wrapped.length; index += 1) {
    lines.push(`${prefix}${wrapped[index]}`);
  }
}

function emitCommentLines(lines: string[], prefix: string, value?: string): void {
  if (!value) return;
  for (const line of value.split('\n')) {
    lines.push(`${prefix}${line}`);
  }
}

function effectiveFlagComment(entry: PoEntry): string | undefined {
  const nonFuzzyFlags = splitFlagComment(entry.comments.flag).filter((flag) => flag !== 'fuzzy');
  return entry.isFuzzy ? ['fuzzy', ...nonFuzzyFlags].join(', ') : nonFuzzyFlags.join(', ') || undefined;
}

function emitEntry(lines: string[], entry: PoEntry, effectiveMetadata?: PoMetadata): void {
  emitCommentLines(lines, '# ', entry.comments.translator);
  emitCommentLines(lines, '#. ', entry.comments.extracted);
  emitCommentLines(lines, '#: ', entry.comments.reference);

  const effectiveFlags = effectiveFlagComment(entry);
  if (effectiveFlags) {
    lines.push(`#, ${effectiveFlags}`);
  }

  emitCommentLines(lines, entry.isObsolete ? '#~| ' : '#| ', entry.comments.previous);

  const prefix = entry.isObsolete ? '#~ ' : null;

  if (entry.msgctxt !== null) {
    emitPoFieldWithPrefix(lines, 'msgctxt', escapeForPo(entry.msgctxt), prefix);
  }

  if (entry.msgid === '') {
    lines.push(prefix ? `${prefix}msgid ""` : 'msgid ""');
  } else {
    emitPoFieldWithPrefix(lines, 'msgid', escapeForPo(entry.msgid), prefix);
  }

  if (entry.msgidPlural) {
    emitPoFieldWithPrefix(lines, 'msgid_plural', escapeForPo(entry.msgidPlural), prefix);
    entry.msgstrPlural.forEach((pluralStr, index) => {
      emitPoFieldWithPrefix(lines, `msgstr[${String(index)}]`, escapeForPo(pluralStr), prefix);
    });
  } else if (entry.msgid === '' && effectiveMetadata) {
    lines.push(prefix ? `${prefix}msgstr ""` : 'msgstr ""');
    const headerLines = buildHeaderString(effectiveMetadata).split('\n').filter(Boolean);
    for (const headerLine of headerLines) {
      lines.push(`${prefix ?? ''}"${escapeForPo(headerLine)}\\n"`);
    }
  } else {
    emitPoFieldWithPrefix(lines, 'msgstr', escapeForPo(entry.msgstr), prefix);
  }

  lines.push('');
}

export function serializePo(
  entries: PoEntry[],
  metadata: PoMetadata,
  options?: SerializeOptions,
): string {
  const effectiveMetadata: PoMetadata = { ...metadata };

  if (effectiveMetadata.xGenerator) {
    effectiveMetadata.xGenerator = APP_GENERATOR;
  }

  if (options?.updateRevisionDate) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const tz = '+0000';
    effectiveMetadata.poRevisionDate = `${y}-${m}-${d} ${hh}:${mm}${tz}`;
  }

  const normalized = normalizePoEntries(entries);
  const lines: string[] = [];
  const headerEntry: PoEntry = normalized.headerEntry ?? {
    id: '__header__',
    msgctxt: null,
    msgid: '',
    msgidPlural: null,
    msgstr: '',
    msgstrPlural: [],
    comments: {},
    isFuzzy: false,
    isObsolete: false,
    isTranslated: true,
  };

  emitEntry(lines, headerEntry, effectiveMetadata);
  for (const entry of normalized.activeEntries) {
    emitEntry(lines, entry);
  }
  for (const entry of normalized.obsoleteEntries) {
    emitEntry(lines, entry);
  }

  const poContent = `${lines.join('\n').trimEnd()}\n`;
  validateSerializedPo(poContent);
  return poContent;
}

export function serializeMo(entries: PoEntry[], metadata: PoMetadata): Buffer {
  const normalized = normalizePoEntries(entries);
  const translations: Record<string, Record<string, { msgstr: string[] }>> = {
    '': {},
  };

  translations[''][''] = {
    msgstr: [buildHeaderString(metadata)],
  };

  for (const entry of normalized.activeEntries) {
    const context = entry.msgctxt ?? '';
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Record type doesn't model missing keys
    if (!translations[context]) {
      translations[context] = {};
    }

    if (entry.msgidPlural) {
      translations[context][entry.msgid] = {
        msgstr: entry.msgstrPlural,
      };
    } else {
      translations[context][entry.msgid] = {
        msgstr: [entry.msgstr],
      };
    }
  }

  const moData = { translations };
  return gettextParser.mo.compile(moData);
}

function buildHeaderString(metadata: PoMetadata): string {
  const headers = [
    `Project-Id-Version: ${metadata.projectVersion}`,
    `Report-Msgid-Bugs-To: ${metadata.reportMsgidBugsTo}`,
    `POT-Creation-Date: ${metadata.potCreationDate}`,
    `PO-Revision-Date: ${metadata.poRevisionDate}`,
    `Last-Translator: ${metadata.lastTranslator}`,
    `Language-Team: ${metadata.languageTeam}`,
    `Language: ${metadata.language}`,
    `Content-Type: ${metadata.contentType}`,
    `Content-Transfer-Encoding: ${metadata.contentTransferEncoding}`,
    `Plural-Forms: ${metadata.pluralForms}`,
  ];
  if (metadata.xGenerator) {
    headers.push(`X-Generator: ${metadata.xGenerator}`);
  }
  if (metadata.extraHeaders) {
    for (const [key, value] of Object.entries(metadata.extraHeaders)) {
      headers.push(`${key}: ${value}`);
    }
  }
  return headers.join('\n');
}

function validateSerializedPo(content: string): void {
  try {
    const parsed = gettextParser.po.parse(
      content
        .replace(/^#~\|/gm, '#|')
        .replace(/^(#~\s*)?msgctxt ""$/gm, (_match, prefix: string | undefined) => {
          return `${prefix ?? ''}msgctxt "${VALIDATION_EMPTY_CONTEXT_SENTINEL}"`;
        }),
      { validation: true },
    );
    const activeKeys = new Set<string>();

    for (const [context, entries] of Object.entries(parsed.translations)) {
      for (const msgid of Object.keys(entries)) {
        const normalizedContext =
          context === ''
            ? null
            : context === VALIDATION_EMPTY_CONTEXT_SENTINEL
              ? ''
              : context;
        activeKeys.add(JSON.stringify([normalizedContext, msgid]));
      }
    }

    for (const [context, entries] of Object.entries(parsed.obsolete ?? {})) {
      for (const msgid of Object.keys(entries)) {
        const normalizedContext =
          context === ''
            ? null
            : context === VALIDATION_EMPTY_CONTEXT_SENTINEL
              ? ''
              : context;
        const key = JSON.stringify([normalizedContext, msgid]);
        if (activeKeys.has(key)) {
          throw new PoCatalogError(
            'normalize',
            'active-obsolete-duplicate-output',
            `Serialized PO contains active and obsolete variants of "${msgid}"`,
            {
              msgctxt: normalizedContext,
              msgid,
            },
          );
        }
      }
    }
  } catch (error) {
    if (error instanceof PoCatalogError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new PoCatalogError('normalize', 'invalid-serialized-po', error.message);
    }

    throw error;
  }
}
