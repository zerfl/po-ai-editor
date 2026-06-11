import { describe, it, expect } from 'vitest';
import { serializePo, serializeMo } from '../services/po-serializer';
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
});
