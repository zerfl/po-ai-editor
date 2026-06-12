import { describe, expect, it } from 'vitest';
import type { PoEntry, PoMetadata } from '@po-ai-editor/shared';
import { parsePo } from '../services/po-parser';
import { serializeMo, serializePo } from '../services/po-serializer';
import { PoCatalogError } from '../services/po-errors';
import { assertMsgfmtValidPo, readFixture } from './po-test-helpers';

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

function headerEntry(): PoEntry {
  return {
    id: 'header',
    msgctxt: null,
    msgid: '',
    msgidPlural: null,
    msgstr: '',
    msgstrPlural: [],
    comments: {
      translator: 'Header translator comment',
    },
    isFuzzy: false,
    isObsolete: false,
    isTranslated: true,
  };
}

describe('po-serializer', () => {
  it('always emits a valid header from metadata and passes msgfmt validation', () => {
    const result = serializePo(
      [
        headerEntry(),
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
      ],
      {
        ...sampleMetadata,
        extraHeaders: {
          'MIME-Version': '1.0',
          'X-Domain': 'acme-starter',
        },
      },
    );

    expect(result).toContain('msgid ""');
    expect(result).toContain('"MIME-Version: 1.0\\n"');
    expect(result).toContain('"X-Domain: acme-starter\\n"');
    expect(result).toContain('# Header translator comment');
    assertMsgfmtValidPo(result);
  });

  it('collapses duplicate active entries by logical key and merges their references', () => {
    const result = serializePo(
      [
        headerEntry(),
        {
          id: '1',
          msgctxt: 'Page title',
          msgid: 'Pre-Order',
          msgidPlural: null,
          msgstr: 'Kurse',
          msgstrPlural: [],
          comments: { reference: 'inc/A.php:62' },
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
        {
          id: '2',
          msgctxt: 'Page title',
          msgid: 'Pre-Order',
          msgidPlural: null,
          msgstr: 'Kurse',
          msgstrPlural: [],
          comments: { reference: 'inc/A.php:74' },
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ],
      sampleMetadata,
    );

    expect(result.match(/msgid "Pre-Order"/g)).toHaveLength(1);
    expect(result).toContain('#: inc/A.php:62');
    expect(result).toContain('#: inc/A.php:74');
    assertMsgfmtValidPo(result);
  });

  it('keeps same msgid values separate when their contexts differ', () => {
    const result = serializePo(
      [
        headerEntry(),
        {
          id: '1',
          msgctxt: null,
          msgid: 'Post',
          msgidPlural: null,
          msgstr: 'Beitrag',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
        {
          id: '2',
          msgctxt: 'button',
          msgid: 'Post',
          msgidPlural: null,
          msgstr: 'Senden',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ],
      sampleMetadata,
    );

    const reparsed = parsePo(result, 'contexts.po');
    const postEntries = reparsed.entries.filter((entry) => entry.msgid === 'Post');
    expect(postEntries).toHaveLength(2);
    expect(postEntries.find((entry) => entry.msgctxt === null)?.msgstr).toBe('Beitrag');
    expect(postEntries.find((entry) => entry.msgctxt === 'button')?.msgstr).toBe('Senden');
    assertMsgfmtValidPo(result);
  });

  it('emits valid obsolete entries with previous history and no bare lines', () => {
    const result = serializePo(
      [
        headerEntry(),
        {
          id: 'obsolete',
          msgctxt: null,
          msgid: 'Old string',
          msgidPlural: null,
          msgstr: 'Alter Text',
          msgstrPlural: [],
          comments: {
            previous: 'msgid "Older string"',
            flag: 'fuzzy',
          },
          isFuzzy: true,
          isObsolete: true,
          isTranslated: true,
        },
      ],
      sampleMetadata,
    );

    expect(result).toContain('#~| msgid "Older string"');
    expect(result).toContain('#~ msgid "Old string"');
    expect(result).toContain('#~ msgstr "Alter Text"');
    expect(result).not.toContain('#~ Old string');
    assertMsgfmtValidPo(result);
  });

  it('drops obsolete twins when an active entry with the same key exists', () => {
    const result = serializePo(
      [
        headerEntry(),
        {
          id: 'active',
          msgctxt: 'button',
          msgid: 'Post',
          msgidPlural: null,
          msgstr: 'Senden',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
        {
          id: 'obsolete',
          msgctxt: 'button',
          msgid: 'Post',
          msgidPlural: null,
          msgstr: 'Alt',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: true,
          isTranslated: true,
        },
      ],
      sampleMetadata,
    );

    expect(result.match(/msgctxt "button"/g)).toHaveLength(1);
    expect(result).not.toContain('#~ msgid "Post"');
    assertMsgfmtValidPo(result);
  });

  it('preserves explicit empty context distinctly from no context', () => {
    const result = serializePo(
      [
        headerEntry(),
        {
          id: '1',
          msgctxt: null,
          msgid: 'Status',
          msgidPlural: null,
          msgstr: 'Status',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
        {
          id: '2',
          msgctxt: '',
          msgid: 'Status',
          msgidPlural: null,
          msgstr: 'Leerer Kontext',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ],
      sampleMetadata,
    );

    expect(result).toContain('msgctxt ""');
    const reparsed = parsePo(result, 'empty-context.po');
    const entries = reparsed.entries.filter((entry) => entry.msgid === 'Status');
    expect(entries).toHaveLength(2);
    expect(entries.find((entry) => entry.msgctxt === null)?.msgstr).toBe('Status');
    expect(entries.find((entry) => entry.msgctxt === '')?.msgstr).toBe('Leerer Kontext');
    assertMsgfmtValidPo(result);
  });

  it('preserves backslashes, quotes, and tabs in round-trip output', () => {
    const result = serializePo(
      [
        headerEntry(),
        {
          id: '1',
          msgctxt: null,
          msgid: 'path\\root\\file',
          msgidPlural: null,
          msgstr: 'Pfad\\wurzel\\Datei',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
        {
          id: '2',
          msgctxt: null,
          msgid: 'say "hello"',
          msgidPlural: null,
          msgstr: 'sag "hallo"',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
        {
          id: '3',
          msgctxt: null,
          msgid: 'col1\tcol2',
          msgidPlural: null,
          msgstr: 'col1\tcol2',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ],
      sampleMetadata,
    );

    const reparsed = parsePo(result, 'escapes.po');
    expect(reparsed.entries.find((entry) => entry.msgid === 'path\\root\\file')?.msgstr).toBe(
      'Pfad\\wurzel\\Datei',
    );
    expect(reparsed.entries.find((entry) => entry.msgid === 'say "hello"')?.msgstr).toBe(
      'sag "hallo"',
    );
    expect(reparsed.entries.find((entry) => entry.msgid === 'col1\tcol2')?.msgstr).toBe(
      'col1\tcol2',
    );
    assertMsgfmtValidPo(result);
  });

  it('rewrites stale fuzzy flags based on isFuzzy state', () => {
    const result = serializePo(
      [
        headerEntry(),
        {
          id: '1',
          msgctxt: null,
          msgid: 'Hello',
          msgidPlural: null,
          msgstr: 'Hallo',
          msgstrPlural: [],
          comments: { flag: 'fuzzy, php-format' },
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ],
      sampleMetadata,
    );

    expect(result).toContain('#, php-format');
    expect(result).not.toContain('#, fuzzy, php-format');
    const reparsed = parsePo(result, 'fuzzy.po');
    const hello = reparsed.entries.find((entry) => entry.msgid === 'Hello');
    expect(hello?.isFuzzy).toBe(false);
    expect(hello?.comments.flag).toBe('php-format');
  });

  it('fails export when duplicate active entries disagree on translation content', () => {
    expect(() =>
      serializePo(
        [
          headerEntry(),
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
            msgid: 'Hello',
            msgidPlural: null,
            msgstr: 'Servus',
            msgstrPlural: [],
            comments: {},
            isFuzzy: false,
            isObsolete: false,
            isTranslated: true,
          },
        ],
        sampleMetadata,
      ),
    ).toThrowError(PoCatalogError);
  });

  it('uses the same normalized active catalog for MO export', () => {
    const buffer = serializeMo(
      [
        headerEntry(),
        {
          id: '1',
          msgctxt: 'Page title',
          msgid: 'Pre-Order',
          msgidPlural: null,
          msgstr: 'Kurse',
          msgstrPlural: [],
          comments: { reference: 'inc/A.php:62' },
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
        {
          id: '2',
          msgctxt: 'Page title',
          msgid: 'Pre-Order',
          msgidPlural: null,
          msgstr: 'Kurse',
          msgstrPlural: [],
          comments: { reference: 'inc/A.php:74' },
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ],
      sampleMetadata,
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.readUInt32LE(0)).toBe(0x950412de);
  });

  it('round-trips a real fixture and stays valid for external gettext tooling', () => {
    const parsed = parsePo(readFixture('wordpress-valid.po'), 'wordpress-valid.po');
    const serialized = serializePo(parsed.entries, parsed.metadata);
    const reparsed = parsePo(serialized, 'round-trip.po');

    expect(reparsed.metadata.language).toBe('de_DE');
    expect(reparsed.entries.find((entry) => entry.msgid === 'Display Mode')?.msgstr).toBe(
      'Anzeigemodus',
    );
    assertMsgfmtValidPo(serialized);
  });
});
