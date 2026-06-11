import gettextParser from 'gettext-parser';
import type { PoEntry, PoMetadata } from '@po-ai-editor/shared';

const APP_GENERATOR = 'PO AI Editor';
const PO_WRAP_WIDTH = 76;

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

export function serializePo(
  entries: PoEntry[],
  metadata: PoMetadata,
  options?: SerializeOptions,
): string {
  const lines: string[] = [];
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

  for (const entry of entries) {
    if (entry.isObsolete) {
      lines.push('#~ ' + escapeForPo(entry.msgid));
      continue;
    }

    if (entry.comments.translator) {
      for (const line of entry.comments.translator.split('\n')) {
        lines.push(`# ${line}`);
      }
    }
    if (entry.comments.extracted) {
      for (const line of entry.comments.extracted.split('\n')) {
        lines.push(`#. ${line}`);
      }
    }
    if (entry.comments.reference) {
      for (const line of entry.comments.reference.split('\n')) {
        lines.push(`#: ${line}`);
      }
    }
    if (entry.comments.flag) {
      lines.push(`#, ${entry.comments.flag}`);
    }

    if (entry.msgctxt) {
      emitPoField(lines, 'msgctxt', escapeForPo(entry.msgctxt));
    }

    const escapedMsgid = escapeForPo(entry.msgid);
    if (entry.msgid === '') {
      lines.push('msgid ""');
    } else {
      emitPoField(lines, 'msgid', escapedMsgid);
    }

    const msgstr = entry.msgid === '' ? buildHeaderString(effectiveMetadata) : entry.msgstr;

    if (entry.msgidPlural) {
      emitPoField(lines, 'msgid_plural', escapeForPo(entry.msgidPlural));
      entry.msgstrPlural.forEach((pluralStr, i) => {
        emitPoField(lines, `msgstr[${String(i)}]`, escapeForPo(pluralStr));
      });
    } else {
      if (entry.msgid === '') {
        lines.push('msgstr ""');
        const headerLines = msgstr.split('\n');
        for (const hLine of headerLines) {
          lines.push(`"${escapeForPo(hLine)}\\n"`);
        }
      } else {
        emitPoField(lines, 'msgstr', escapeForPo(msgstr));
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

export function serializeMo(entries: PoEntry[], metadata: PoMetadata): Buffer {
  const translations: Record<string, Record<string, { msgstr: string[] }>> = {
    '': {},
  };

  translations[''][''] = {
    msgstr: [buildHeaderString(metadata)],
  };

  for (const entry of entries) {
    if (entry.isObsolete) continue;

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
