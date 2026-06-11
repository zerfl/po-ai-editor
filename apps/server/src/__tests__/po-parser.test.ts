import { describe, it, expect } from 'vitest';
import { parsePo } from '../services/po-parser';

const samplePo = `# Test PO file
msgid ""
msgstr ""
"Project-Id-Version: test\\n"
"Language: de\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

msgid "Hello"
msgstr "Hallo"

#. This is a comment
#: src/main.ts:42
#, fuzzy
msgid "Fuzzy entry"
msgstr "Unscharfer Eintrag"
`;

const samplePoObsolete = `# Test PO file with obsolete entries
msgid ""
msgstr ""
"Project-Id-Version: test\\n"
"Language: de\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

msgid "Active entry"
msgstr "Aktiver Eintrag"

#, fuzzy
#~| msgid "Qualitrain enabled"
#~ msgid "Qualitrain Einstellungen"
#~ msgstr "Qualitrain/EGYM aktiviert"
`;

describe('po-parser', () => {
  it('should parse a PO file', () => {
    const result = parsePo(samplePo, 'test.po');
    expect(result.filename).toBe('test.po');
    expect(result.metadata.language).toBe('de');
    expect(result.entries.length).toBeGreaterThan(0);
  });

  it('should parse simple entries', () => {
    const result = parsePo(samplePo, 'test.po');
    const hello = result.entries.find((e) => e.msgid === 'Hello');
    expect(hello).toBeDefined();
    expect(hello?.msgstr).toBe('Hallo');
    expect(hello?.isTranslated).toBe(true);
  });

  it('should parse fuzzy entries', () => {
    const result = parsePo(samplePo, 'test.po');
    const fuzzy = result.entries.find((e) => e.msgid === 'Fuzzy entry');
    expect(fuzzy).toBeDefined();
    expect(fuzzy?.isFuzzy).toBe(true);
  });

  it('should parse comments', () => {
    const result = parsePo(samplePo, 'test.po');
    const fuzzy = result.entries.find((e) => e.msgid === 'Fuzzy entry');
    expect(fuzzy?.comments.extracted).toBe('This is a comment');
    expect(fuzzy?.comments.reference).toBe('src/main.ts:42');
  });

  it('should handle obsolete entries with previous context (#~|)', () => {
    const result = parsePo(samplePoObsolete, 'test.po');
    expect(result.filename).toBe('test.po');
    expect(result.metadata.language).toBe('de');
    const active = result.entries.find((e) => e.msgid === 'Active entry');
    expect(active).toBeDefined();
    expect(active?.msgstr).toBe('Aktiver Eintrag');
  });
});
