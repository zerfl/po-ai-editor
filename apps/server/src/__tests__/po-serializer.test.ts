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
"Project-Id-Version: Acme Starter 2.0\\n"
"Report-Msgid-Bugs-To: https://example.com/support\\n"
"POT-Creation-Date: 2026-01-15T10:30:00+00:00\\n"
"PO-Revision-Date: 2026-02-20 14:00+0100\\n"
"Last-Translator: Jane Doe <jane@example.com>\\n"
"Language-Team: \\n"
"Language: de_DE\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"
"X-Generator: Poedit 3.7\\n"
"X-Domain: acme-starter\\n"

msgid "Hello"
msgstr "Hallo"
`;
    const parsed = parsePo(poContent, 'test.po');
    const serialized = serializePo(parsed.entries, parsed.metadata);
    const reparsed = parsePo(serialized, 'test.po');

    expect(reparsed.metadata.language).toBe('de_DE');
    expect(reparsed.metadata.projectVersion).toBe('Acme Starter 2.0');
    expect(reparsed.metadata.contentType).toBe('text/plain; charset=UTF-8');
    expect(reparsed.metadata.pluralForms).toBe('nplurals=2; plural=(n != 1);');
    expect(reparsed.metadata.lastTranslator).toBe('Jane Doe <jane@example.com>');
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

  describe('multi-reference comments (#:)', () => {
    it('should prefix each reference line with #:', () => {
      const entries: PoEntry[] = [
        {
          id: '1',
          msgctxt: null,
          msgid: 'Course Mode',
          msgidPlural: null,
          msgstr: 'Anzeigemodus',
          msgstrPlural: [],
          comments: {
            reference:
              'inc/Elementor/Conditions/Course_Mode.php:24\n' +
              'inc/Elementor/Widgets/Periods_Calendar.php:320\n' +
              'inc/Elementor/Widgets/Periods_Daily.php:255\n' +
              'inc/Modules/BulkCourseCreator.php:97',
          },
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ];
      const result = serializePo(entries, sampleMetadata);
      const lines = result.split('\n');
      const refLines = lines.filter((l) => l.startsWith('#:'));
      expect(refLines).toHaveLength(4);
      expect(refLines[0]).toBe('#: inc/Elementor/Conditions/Course_Mode.php:24');
      expect(refLines[1]).toBe('#: inc/Elementor/Widgets/Periods_Calendar.php:320');
      expect(refLines[2]).toBe('#: inc/Elementor/Widgets/Periods_Daily.php:255');
      expect(refLines[3]).toBe('#: inc/Modules/BulkCourseCreator.php:97');
    });

    it('should not produce bare lines without #:', () => {
      const entries: PoEntry[] = [
        {
          id: '1',
          msgctxt: null,
          msgid: 'Test',
          msgidPlural: null,
          msgstr: 'Test',
          msgstrPlural: [],
          comments: { reference: 'a.php:1\nb.php:2' },
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ];
      const result = serializePo(entries, sampleMetadata);
      const lines = result.split('\n');
      for (const line of lines) {
        if (line.trim() && !line.startsWith('#') && !line.startsWith('msg')) {
          expect(line).toMatch(/^$/);
        }
      }
    });
  });

  describe('multi-line extracted comments (#.)', () => {
    it('should prefix each extracted comment line with #.', () => {
      const entries: PoEntry[] = [
        {
          id: '1',
          msgctxt: null,
          msgid: 'Test',
          msgidPlural: null,
          msgstr: 'Test',
          msgstrPlural: [],
          comments: {
            extracted: 'First extracted line\nSecond extracted line',
          },
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ];
      const result = serializePo(entries, sampleMetadata);
      expect(result).toContain('#. First extracted line');
      expect(result).toContain('#. Second extracted line');
    });
  });

  describe('multiline string formatting', () => {
    it('should wrap long msgid across multiple quoted lines', () => {
      const longMsgid =
        'Theme autoload file missing: %s. Run Composer install before loading this theme.';
      const entries: PoEntry[] = [
        {
          id: '1',
          msgctxt: null,
          msgid: longMsgid,
          msgidPlural: null,
          msgstr: 'Lang',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ];
      const result = serializePo(entries, sampleMetadata);
      const reparsed = parsePo(result, 'test.po');
      expect(reparsed.entries[0]?.msgid).toBe(longMsgid);
    });

    it('should wrap long msgstr across multiple quoted lines', () => {
      const longMsgstr =
        'Theme-Autoload-Datei fehlt: %s. Führen Sie Composer install aus, bevor dieses Theme geladen wird.';
      const entries: PoEntry[] = [
        {
          id: '1',
          msgctxt: null,
          msgid: 'short',
          msgidPlural: null,
          msgstr: longMsgstr,
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ];
      const result = serializePo(entries, sampleMetadata);
      const reparsed = parsePo(result, 'test.po');
      expect(reparsed.entries[0]?.msgstr).toBe(longMsgstr);
    });

    it('should not wrap short strings', () => {
      const entries: PoEntry[] = [
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
      const result = serializePo(entries, sampleMetadata);
      expect(result).toContain('msgid "Hello"');
      expect(result).toContain('msgstr "Hallo"');
    });
  });

  describe('header format', () => {
    it('should serialize header as multi-line with separate quoted strings', () => {
      const entries: PoEntry[] = [
        {
          id: '0',
          msgctxt: null,
          msgid: '',
          msgidPlural: null,
          msgstr: '',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
        ...sampleEntries,
      ];
      const result = serializePo(entries, sampleMetadata);
      expect(result).toContain('msgid ""');
      expect(result).toMatch(/msgstr ""\n"Project-Id-Version:/);
    });

    it('should produce valid PO that re-parses correctly', () => {
      const entries: PoEntry[] = [
        {
          id: '0',
          msgctxt: null,
          msgid: '',
          msgidPlural: null,
          msgstr: '',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
        ...sampleEntries,
      ];
      const result = serializePo(entries, sampleMetadata);
      const reparsed = parsePo(result, 'test.po');
      expect(reparsed.metadata.language).toBe('de');
      expect(reparsed.metadata.projectVersion).toBe('1.0');
      expect(reparsed.metadata.contentType).toBe('text/plain; charset=UTF-8');
    });
  });

  describe('unknown header preservation', () => {
    it('should preserve MIME-Version in round-trip', () => {
      const poContent = `msgid ""
msgstr ""
"Project-Id-Version: test\\n"
"Language: de\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"
"MIME-Version: 1.0\\n"

msgid "Hello"
msgstr "Hallo"
`;
      const parsed = parsePo(poContent, 'test.po');
      expect(parsed.metadata.extraHeaders?.['MIME-Version']).toBe('1.0');
      const serialized = serializePo(parsed.entries, parsed.metadata);
      expect(serialized).toContain('MIME-Version: 1.0');
    });

    it('should preserve X-Domain in round-trip', () => {
      const poContent = `msgid ""
msgstr ""
"Project-Id-Version: test\\n"
"Language: de\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"
"X-Domain: acme-starter\\n"

msgid "Hello"
msgstr "Hallo"
`;
      const parsed = parsePo(poContent, 'test.po');
      expect(parsed.metadata.extraHeaders?.['X-Domain']).toBe('acme-starter');
      const serialized = serializePo(parsed.entries, parsed.metadata);
      const reparsed = parsePo(serialized, 'test.po');
      expect(reparsed.metadata.extraHeaders?.['X-Domain']).toBe('acme-starter');
    });

    it('should preserve multiple unknown headers', () => {
      const poContent = `msgid ""
msgstr ""
"Project-Id-Version: test\\n"
"Language: de\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"
"MIME-Version: 1.0\\n"
"X-Domain: my-domain\\n"
"X-Custom-Header: custom-value\\n"

msgid "Hello"
msgstr "Hallo"
`;
      const parsed = parsePo(poContent, 'test.po');
      const serialized = serializePo(parsed.entries, parsed.metadata);
      const reparsed = parsePo(serialized, 'test.po');
      expect(reparsed.metadata.extraHeaders?.['MIME-Version']).toBe('1.0');
      expect(reparsed.metadata.extraHeaders?.['X-Domain']).toBe('my-domain');
      expect(reparsed.metadata.extraHeaders?.['X-Custom-Header']).toBe('custom-value');
    });
  });

  describe('PO-Revision-Date update', () => {
    it('should update revision date when updateRevisionDate is true', () => {
      const entries: PoEntry[] = [
        {
          id: '0',
          msgctxt: null,
          msgid: '',
          msgidPlural: null,
          msgstr: '',
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
        poRevisionDate: '2020-01-01 00:00+0000',
      };
      const result = serializePo(entries, metadata, { updateRevisionDate: true });
      expect(result).not.toContain('PO-Revision-Date: 2020-01-01');
      expect(result).toMatch(/PO-Revision-Date: \d{4}-\d{2}-\d{2}/);
    });

    it('should keep original revision date when updateRevisionDate is false', () => {
      const entries: PoEntry[] = [
        {
          id: '0',
          msgctxt: null,
          msgid: '',
          msgidPlural: null,
          msgstr: '',
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
        poRevisionDate: '2020-01-01 00:00+0000',
      };
      const result = serializePo(entries, metadata);
      expect(result).toContain('PO-Revision-Date: 2020-01-01 00:00+0000');
    });
  });

  describe('escape sequences', () => {
    it('should preserve backslashes', () => {
      const entries: PoEntry[] = [
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
      ];
      const result = serializePo(entries, sampleMetadata);
      const reparsed = parsePo(result, 'test.po');
      expect(reparsed.entries[0]?.msgid).toBe('path\\root\\file');
      expect(reparsed.entries[0]?.msgstr).toBe('Pfad\\wurzel\\Datei');
    });

    it('should preserve double quotes', () => {
      const entries: PoEntry[] = [
        {
          id: '1',
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
      ];
      const result = serializePo(entries, sampleMetadata);
      const reparsed = parsePo(result, 'test.po');
      expect(reparsed.entries[0]?.msgid).toBe('say "hello"');
      expect(reparsed.entries[0]?.msgstr).toBe('sag "hallo"');
    });

    it('should preserve tabs', () => {
      const entries: PoEntry[] = [
        {
          id: '1',
          msgctxt: null,
          msgid: 'col1\tcol2',
          msgidPlural: null,
          msgstr: 'Spalte1\tSpalte2',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ];
      const result = serializePo(entries, sampleMetadata);
      const reparsed = parsePo(result, 'test.po');
      expect(reparsed.entries[0]?.msgid).toBe('col1\tcol2');
    });
  });

  describe('msgctxt (context)', () => {
    it('should serialize and round-trip context', () => {
      const entries: PoEntry[] = [
        {
          id: '1',
          msgctxt: 'button',
          msgid: 'Post',
          msgidPlural: null,
          msgstr: 'Veröffentlichen',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ];
      const result = serializePo(entries, sampleMetadata);
      expect(result).toContain('msgctxt "button"');
      expect(result).toContain('msgid "Post"');
      const reparsed = parsePo(result, 'test.po');
      const entry = reparsed.entries.find((e) => e.msgid === 'Post');
      expect(entry?.msgctxt).toBe('button');
      expect(entry?.msgstr).toBe('Veröffentlichen');
    });
  });

  describe('fuzzy flag', () => {
    it('should preserve fuzzy flag in round-trip', () => {
      const entries: PoEntry[] = [
        {
          id: '1',
          msgctxt: null,
          msgid: 'Hello',
          msgidPlural: null,
          msgstr: 'Hallo',
          msgstrPlural: [],
          comments: { flag: 'fuzzy' },
          isFuzzy: true,
          isObsolete: false,
          isTranslated: true,
        },
      ];
      const result = serializePo(entries, sampleMetadata);
      expect(result).toContain('#, fuzzy');
      const reparsed = parsePo(result, 'test.po');
      expect(reparsed.entries[0]?.isFuzzy).toBe(true);
    });

    it('should preserve multiple flags', () => {
      const entries: PoEntry[] = [
        {
          id: '1',
          msgctxt: null,
          msgid: 'Hello',
          msgidPlural: null,
          msgstr: 'Hallo',
          msgstrPlural: [],
          comments: { flag: 'fuzzy, php-format' },
          isFuzzy: true,
          isObsolete: false,
          isTranslated: true,
        },
      ];
      const result = serializePo(entries, sampleMetadata);
      expect(result).toContain('#, fuzzy, php-format');
    });
  });

  describe('full round-trip with realistic multi-feature input', () => {
    const userPo = `# Copyright (C) 2024 Acme Corp <info@example.com>
# This file is distributed under the MIT License.
msgid ""
msgstr ""
"Project-Id-Version: Acme Starter 2.0\\n"
"Report-Msgid-Bugs-To: https://example.com/support\\n"
"POT-Creation-Date: 2026-01-15T10:30:00+00:00\\n"
"PO-Revision-Date: 2026-02-20 14:00+0100\\n"
"Last-Translator: Jane Doe <jane@example.com>\\n"
"Language-Team: \\n"
"Language: de_DE\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"
"X-Generator: Poedit 3.7\\n"
"X-Domain: acme-starter\\n"

#. Theme Name of the theme
#: style.css
msgid "Acme Starter"
msgstr "Acme Starter"

#. Author of the theme
#: style.css
msgid "Acme Corp <info@example.com>"
msgstr "Acme Corp <info@example.com>"

#. Author URI of the theme
#: style.css
msgid "https://www.example.com/"
msgstr "https://www.example.com/"

#. translators: %s: absolute path to Composer autoload file
#: functions.php:18
#, php-format
msgid ""
"Theme autoload file missing: %s. Run Composer install before loading this "
"theme."
msgstr ""
"Theme-Autoload-Datei fehlt: %s. Führen Sie Composer install aus, bevor "
"dieses Theme geladen wird."

#: functions.php:22
msgid "Missing Composer Autoload"
msgstr "Fehlender Composer-Autoload"

#: inc/Modules/Display_Condition.php:24
#: inc/Widgets/Calendar_Widget.php:320
#: inc/Widgets/Daily_Widget.php:255
#: inc/Modules/BulkCreator.php:97
msgid "Display Mode"
msgstr "Anzeigemodus"
`;

    it('should produce output that can be re-parsed without error', () => {
      const parsed = parsePo(userPo, 'acme-starter-de_DE.po');
      const serialized = serializePo(parsed.entries, parsed.metadata);
      expect(() => parsePo(serialized, 'test.po')).not.toThrow();
    });

    it('should preserve all entries in round-trip', () => {
      const parsed = parsePo(userPo, 'test.po');
      const serialized = serializePo(parsed.entries, parsed.metadata);
      const reparsed = parsePo(serialized, 'test.po');
      const nonHeaderEntries = parsed.entries.filter((e) => e.msgid !== '');
      const reparsedNonHeader = reparsed.entries.filter((e) => e.msgid !== '');
      expect(reparsedNonHeader).toHaveLength(nonHeaderEntries.length);
      for (const orig of nonHeaderEntries) {
        const found = reparsedNonHeader.find((e) => e.msgid === orig.msgid);
        expect(found).toBeDefined();
        expect(found?.msgstr).toBe(orig.msgstr);
      }
    });

    it('should preserve multiline msgid/msgstr in round-trip', () => {
      const parsed = parsePo(userPo, 'test.po');
      const serialized = serializePo(parsed.entries, parsed.metadata);
      const reparsed = parsePo(serialized, 'test.po');
      const autoload = reparsed.entries.find((e) =>
        e.msgid.includes('Theme autoload file missing'),
      );
      expect(autoload).toBeDefined();
      expect(autoload?.msgstr).toContain('Theme-Autoload-Datei fehlt');
    });

    it('should preserve all reference lines in round-trip', () => {
      const parsed = parsePo(userPo, 'test.po');
      const serialized = serializePo(parsed.entries, parsed.metadata);
      const reparsed = parsePo(serialized, 'test.po');
      const displayMode = reparsed.entries.find((e) => e.msgid === 'Display Mode');
      expect(displayMode).toBeDefined();
      expect(displayMode?.comments.reference).toContain('inc/Modules/Display_Condition.php:24');
      expect(displayMode?.comments.reference).toContain('inc/Widgets/Calendar_Widget.php:320');
      expect(displayMode?.comments.reference).toContain('inc/Widgets/Daily_Widget.php:255');
      expect(displayMode?.comments.reference).toContain('inc/Modules/BulkCreator.php:97');
    });

    it('should preserve translator comments in round-trip', () => {
      const parsed = parsePo(userPo, 'test.po');
      const serialized = serializePo(parsed.entries, parsed.metadata);
      const reparsed = parsePo(serialized, 'test.po');
      const headerEntry = reparsed.entries.find((e) => e.msgid === '');
      expect(headerEntry?.comments.translator).toContain('Copyright (C) 2024 Acme Corp');
      expect(headerEntry?.comments.translator).toContain('MIT License');
    });

    it('should preserve metadata in round-trip', () => {
      const parsed = parsePo(userPo, 'test.po');
      const serialized = serializePo(parsed.entries, parsed.metadata);
      const reparsed = parsePo(serialized, 'test.po');
      expect(reparsed.metadata.language).toBe('de_DE');
      expect(reparsed.metadata.projectVersion).toBe('Acme Starter 2.0');
      expect(reparsed.metadata.lastTranslator).toBe('Jane Doe <jane@example.com>');
      expect(reparsed.metadata.contentType).toBe('text/plain; charset=UTF-8');
      expect(reparsed.metadata.pluralForms).toBe('nplurals=2; plural=(n != 1);');
    });

    it('should preserve X-Domain in round-trip', () => {
      const parsed = parsePo(userPo, 'test.po');
      const serialized = serializePo(parsed.entries, parsed.metadata);
      const reparsed = parsePo(serialized, 'test.po');
      expect(reparsed.metadata.extraHeaders?.['X-Domain']).toBe('acme-starter');
    });

    it('should preserve MIME-Version in round-trip', () => {
      const parsed = parsePo(userPo, 'test.po');
      const serialized = serializePo(parsed.entries, parsed.metadata);
      const reparsed = parsePo(serialized, 'test.po');
      expect(reparsed.metadata.extraHeaders?.['MIME-Version']).toBe('1.0');
    });

    it('each # line in output should have a comment prefix', () => {
      const parsed = parsePo(userPo, 'test.po');
      const serialized = serializePo(parsed.entries, parsed.metadata);
      const lines = serialized.split('\n');
      for (const line of lines) {
        if (
          line.trim() &&
          !line.startsWith('#') &&
          !line.startsWith('msg') &&
          !line.startsWith('"') &&
          line !== ''
        ) {
          throw new Error(`Bare line without comment prefix: "${line}"`);
        }
      }
    });
  });
});
