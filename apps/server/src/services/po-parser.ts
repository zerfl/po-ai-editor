import gettextParser from 'gettext-parser';
import type { PoEntry, PoFile, PoMetadata } from '@po-ai-editor/shared';
import { randomUUID } from 'crypto';

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

function unescapeString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

export function parsePo(content: string, filename: string): PoFile {
  const parsed = gettextParser.po.parse(content, 'utf-8');
  const entries: PoEntry[] = [];

  for (const [msgid, translation] of Object.entries(parsed.translations[''] || {})) {
    const t = translation as any;
    const msgstr = t.msgstr?.[0] || '';
    const msgstrPlural = t.msgstr?.slice(1) || [];
    const isTranslated = msgstr.length > 0 || msgstrPlural.some((s: string) => s.length > 0);
    const flags = t.comments?.flag?.split(',').map((f: string) => f.trim()).filter(Boolean) || [];
    const isFuzzy = flags.includes('fuzzy');

    entries.push({
      id: randomUUID(),
      msgctxt: t.msgctxt || null,
      msgid: unescapeString(msgid),
      msgidPlural: t.msgid_plural ? unescapeString(t.msgid_plural) : null,
      msgstr: unescapeString(msgstr),
      msgstrPlural: msgstrPlural.map(unescapeString),
      comments: {
        translator: t.comments?.translator || undefined,
        extracted: t.comments?.extracted || undefined,
        reference: t.comments?.reference || undefined,
        flag: t.comments?.flag || undefined,
      },
      isFuzzy,
      isObsolete: false,
      isTranslated,
    });
  }

  const headers = parsed.translations['']?.['']?.msgstr?.[0] || '';
  const headerMap: Record<string, string> = {};
  for (const line of headers.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      headerMap[key] = value;
    }
  }

  const metadata: PoMetadata = {
    projectVersion: headerMap['Project-Id-Version'] || '',
    reportMsgidBugsTo: headerMap['Report-Msgid-Bugs-To'] || '',
    potCreationDate: headerMap['POT-Creation-Date'] || '',
    poRevisionDate: headerMap['PO-Revision-Date'] || '',
    lastTranslator: headerMap['Last-Translator'] || '',
    languageTeam: headerMap['Language-Team'] || '',
    language: headerMap['Language'] || '',
    contentType: headerMap['Content-Type'] || 'text/plain; charset=UTF-8',
    contentTransferEncoding: headerMap['Content-Transfer-Encoding'] || '8bit',
    pluralForms: headerMap['Plural-Forms'] || 'nplurals=2; plural=(n != 1);',
  };

  return { entries, metadata, filename };
}

export function parsePot(content: string, filename: string): PoFile {
  return parsePo(content, filename);
}
