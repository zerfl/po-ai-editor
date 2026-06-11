import gettextParser from 'gettext-parser';
import type { PoEntry, PoFile, PoMetadata } from '@po-ai-editor/shared';
import { randomUUID } from 'crypto';

function unescapeString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

export function parsePo(content: string, filename: string): PoFile {
  content = content.replace(/^#~\|.*$/gm, '');
  const parsed = gettextParser.po.parse(content, 'utf-8');
  const entries: PoEntry[] = [];

  for (const [context, contextEntries] of Object.entries(parsed.translations)) {
    for (const [msgid, translation] of Object.entries(contextEntries)) {
      if (msgid === '' && context !== '') continue;

      const t = translation;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive against missing gettext fields
      const msgstr = t.msgstr?.[0] ?? '';
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive against missing gettext fields
      const msgstrPlural = t.msgstr?.slice(1) ?? [];
      const isTranslated = msgstr.length > 0 || msgstrPlural.some((s: string) => s.length > 0);
      const flags =
        t.comments?.flag
          ?.split(',')
          .map((f: string) => f.trim())
          .filter(Boolean) ?? [];
      const isFuzzy = flags.includes('fuzzy');

      entries.push({
        id: randomUUID(),
        msgctxt: context || null,
        msgid: unescapeString(msgid),
        msgidPlural: t.msgid_plural ? unescapeString(t.msgid_plural) : null,
        msgstr: unescapeString(msgstr),
        msgstrPlural: msgstrPlural.map(unescapeString),
        comments: {
          translator: t.comments?.translator ?? undefined,
          extracted: t.comments?.extracted ?? undefined,
          reference: t.comments?.reference ?? undefined,
          flag: t.comments?.flag ?? undefined,
        },
        isFuzzy,
        isObsolete: false,
        isTranslated,
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- gettext-parser types are imprecise
  const headers = parsed.translations['']?.['']?.msgstr?.[0] ?? '';
  const headerMap: Record<string, string> = {};
  for (const line of headers.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      headerMap[key] = value;
    }
  }

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
}

export function parsePot(content: string, filename: string): PoFile {
  return parsePo(content, filename);
}
