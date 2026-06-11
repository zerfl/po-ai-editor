import { describe, it, expect } from 'vitest';
import { serializePo, serializeMo } from '../services/po-serializer';
import { parsePo } from '../services/po-parser';
import type { PoEntry, PoMetadata } from '@po-ai-editor/shared';

const sampleMetadata: PoMetadata = {
  projectVersion: '1.0',
  reportMsgidBugsTo: '',
  potCreationDate: '2024-01-01',
  poRevisionDate: '2024-01-01',
  lastTranslator: 'Test',
  languageTeam: 'Test',
  language: 'de',
  contentType: 'text/plain; charset=UTF-8',
  contentTransferEncoding: '8bit',
  pluralForms: 'nplurals=2; plural=(n != 1);',
};

const sampleEntries: PoEntry[] = [
  {
    id: '1',
    msgctxt: null,
    msgid: 'Hello',
    msgidPlural: null,
    msgstr: 'Hallo',
    msgstrPlural: [],
    comments: {},
    isFuzzy: false,
    isObsolete: false,
    isTranslated: true,
  },
  {
    id: '2',
    msgctxt: null,
    msgid: 'One item',
    msgidPlural: '%d items',
    msgstr: '',
    msgstrPlural: ['Ein Element', '%d Elemente'],
    comments: {},
    isFuzzy: false,
    isObsolete: false,
    isTranslated: true,
  },
];

describe('po-serializer', () => {
  it('should serialize entries to PO format', () => {
    const result = serializePo(sampleEntries, sampleMetadata);
    expect(result).toContain('msgid "Hello"');
    expect(result).toContain('msgstr "Hallo"');
  });

  it('should serialize plural entries', () => {
    const result = serializePo(sampleEntries, sampleMetadata);
    expect(result).toContain('msgid_plural "%d items"');
    expect(result).toContain('msgstr[0] "Ein Element"');
    expect(result).toContain('msgstr[1] "%d Elemente"');
  });

  it('should generate MO binary', () => {
    const result = serializeMo(sampleEntries, sampleMetadata);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should start with magic number', () => {
    const result = serializeMo(sampleEntries, sampleMetadata);
    const magic = result.readUInt32LE(0);
    expect(magic).toBe(0x950412de);
  });

  it('should serialize multi-line translator comments with # prefix on each line', () => {
    const entries: PoEntry[] = [
      {
        id: '1',
        msgctxt: null,
        msgid: 'Test',
        msgidPlural: null,
        msgstr: 'Test',
        msgstrPlural: [],
        comments: {
          translator: 'Copyright (C) 2024 Author\nThis file is distributed under MIT.',
        },
        isFuzzy: false,
        isObsolete: false,
        isTranslated: true,
      },
    ];
    const result = serializePo(entries, sampleMetadata);
    expect(result).toContain('# Copyright (C) 2024 Author');
    expect(result).toContain('# This file is distributed under MIT.');
  });

  it('should preserve header metadata in round-trip', () => {
    const poContent = `# Translator comment
msgid ""
msgstr ""
"Project-Id-Version: Konzept Yoga 1.0\\n"
"Report-Msgid-Bugs-To: https://example.com\\n"
"POT-Creation-Date: 2026-06-08T07:41:28+00:00\\n"
"PO-Revision-Date: 2026-06-08 09:42+0200\\n"
"Last-Translator: Daniel Martin <daniel@example.de>\\n"
"Language-Team: \\n"
"Language: de_DE\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"
"X-Generator: Poedit 3.7\\n"
"X-Domain: ix-atmungsaktiv\\n"

msgid "Hello"
msgstr "Hallo"
`;
    const parsed = parsePo(poContent, 'test.po');
    const serialized = serializePo(parsed.entries, parsed.metadata);
    const reparsed = parsePo(serialized, 'test.po');

    expect(reparsed.metadata.language).toBe('de_DE');
    expect(reparsed.metadata.projectVersion).toBe('Konzept Yoga 1.0');
    expect(reparsed.metadata.contentType).toBe('text/plain; charset=UTF-8');
    expect(reparsed.metadata.pluralForms).toBe('nplurals=2; plural=(n != 1);');
    expect(reparsed.metadata.lastTranslator).toBe('Daniel Martin <daniel@example.de>');
    expect(reparsed.entries.find((e) => e.msgid === 'Hello')?.msgstr).toBe('Hallo');
  });

  it('should update X-Generator if present', () => {
    const poContent = `msgid ""
msgstr ""
"Project-Id-Version: test\\n"
"Language: de\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"
"X-Generator: Poedit 3.7\\n"

msgid "Hello"
msgstr "Hallo"
`;
    const parsed = parsePo(poContent, 'test.po');
    const serialized = serializePo(parsed.entries, parsed.metadata);
    expect(serialized).toContain('X-Generator: PO AI Editor');
    expect(serialized).not.toContain('Poedit 3.7');
  });

  it('should not add X-Generator if absent', () => {
    const poContent = `msgid ""
msgstr ""
"Project-Id-Version: test\\n"
"Language: de\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

msgid "Hello"
msgstr "Hallo"
`;
    const parsed = parsePo(poContent, 'test.po');
    const serialized = serializePo(parsed.entries, parsed.metadata);
    expect(serialized).not.toContain('X-Generator');
  });

  it('should use metadata for header, not raw entry msgstr', () => {
    const entries: PoEntry[] = [
      {
        id: '0',
        msgctxt: null,
        msgid: '',
        msgidPlural: null,
        msgstr: 'Language: stale\\n',
        msgstrPlural: [],
        comments: {},
        isFuzzy: false,
        isObsolete: false,
        isTranslated: true,
      },
      {
        id: '1',
        msgctxt: null,
        msgid: 'Hello',
        msgidPlural: null,
        msgstr: 'Hallo',
        msgstrPlural: [],
        comments: {},
        isFuzzy: false,
        isObsolete: false,
        isTranslated: true,
      },
    ];
    const metadata: PoMetadata = {
      ...sampleMetadata,
      language: 'fr',
      lastTranslator: 'Updated Translator',
    };
    const result = serializePo(entries, metadata);
    expect(result).toContain('Language: fr');
    expect(result).toContain('Last-Translator: Updated Translator');
    expect(result).not.toContain('stale');
  });
});
