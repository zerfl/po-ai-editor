import gettextParser from 'gettext-parser';
import type { PoEntry, PoMetadata } from '@po-ai-editor/shared';

const APP_GENERATOR = 'PO AI Editor';

function escapeForPo(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

export function serializePo(entries: PoEntry[], metadata: PoMetadata): string {
  const lines: string[] = [];
  const effectiveMetadata: PoMetadata = metadata.xGenerator
    ? { ...metadata, xGenerator: APP_GENERATOR }
    : metadata;

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
      lines.push(`#. ${entry.comments.extracted}`);
    }
    if (entry.comments.reference) {
      lines.push(`#: ${entry.comments.reference}`);
    }
    if (entry.comments.flag) {
      lines.push(`#, ${entry.comments.flag}`);
    }

    if (entry.msgctxt) {
      lines.push(`msgctxt "${escapeForPo(entry.msgctxt)}"`);
    }

    lines.push(`msgid "${escapeForPo(entry.msgid)}"`);

    const msgstr = entry.msgid === '' ? buildHeaderString(effectiveMetadata) : entry.msgstr;

    if (entry.msgidPlural) {
      lines.push(`msgid_plural "${escapeForPo(entry.msgidPlural)}"`);
      entry.msgstrPlural.forEach((pluralStr, i) => {
        lines.push(`msgstr[${String(i)}] "${escapeForPo(pluralStr)}"`);
      });
    } else {
      lines.push(`msgstr "${escapeForPo(msgstr)}"`);
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
  return headers.join('\n');
}
