import { describe, expect, it } from 'vitest';
import { parsePo, parsePot } from '../services/po-parser';
import { PoCatalogError } from '../services/po-errors';
import { readFixture } from './po-test-helpers';

describe('po-parser', () => {
  it('parses metadata, active entries, and repeated references from a real fixture', () => {
    const result = parsePo(readFixture('wordpress-valid.po'), 'wordpress-valid.po');

    expect(result.filename).toBe('wordpress-valid.po');
    expect(result.metadata.language).toBe('de_DE');
    expect(result.metadata.projectVersion).toBe('Acme Starter 2.0');
    expect(result.metadata.extraHeaders?.['MIME-Version']).toBe('1.0');
    expect(result.metadata.extraHeaders?.['X-Domain']).toBe('acme-starter');

    const headerEntry = result.entries.find(
      (entry) => entry.msgctxt === null && entry.msgid === '',
    );
    expect(headerEntry).toBeDefined();

    const displayMode = result.entries.find((entry) => entry.msgid === 'Display Mode');
    expect(displayMode?.comments.reference).toBe(
      'inc/Modules/Display_Condition.php:24\ninc/Widgets/Calendar_Widget.php:320',
    );
  });

  it('preserves obsolete entries and previous-message history from #~| syntax', () => {
    const result = parsePo(readFixture('obsolete-history.po'), 'obsolete-history.po');

    const obsolete = result.entries.find((entry) => entry.isObsolete);
    expect(obsolete).toBeDefined();
    expect(obsolete?.msgid).toBe('Widget Einstellungen');
    expect(obsolete?.msgstr).toBe('Widget aktiviert');
    expect(obsolete?.isFuzzy).toBe(true);
    expect(obsolete?.comments.previous).toBe('msgid "Widget enabled"');
  });

  it('preserves explicit empty context distinctly from no context', () => {
    const result = parsePo(readFixture('empty-context.po'), 'empty-context.po');

    const entries = result.entries.filter((entry) => entry.msgid === 'Status');
    expect(entries).toHaveLength(2);
    expect(entries.find((entry) => entry.msgctxt === null)?.msgstr).toBe('Status');
    expect(entries.find((entry) => entry.msgctxt === '')?.msgstr).toBe('Leerer Kontext');
  });

  it('preserves literal backslash escapes instead of unescaping them twice', () => {
    const po = `msgid ""
msgstr ""
"Project-Id-Version: test\\n"
"PO-Revision-Date: 2026-06-01 10:00+0000\\n"
"Last-Translator: Jane Doe <jane@example.com>\\n"
"Language-Team: German Team\\n"
"Language: de\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

msgid "literal \\\\n sequence"
msgstr "literal \\\\t tab"
`;

    const result = parsePo(po, 'literal.po');
    const entry = result.entries.find((item) => item.msgid.startsWith('literal'));

    expect(entry?.msgid).toBe('literal \\n sequence');
    expect(entry?.msgstr).toBe('literal \\t tab');
  });

  it('rejects duplicate active entries for the same logical key', () => {
    expect(() => parsePo(readFixture('duplicate-active.po'), 'duplicate-active.po')).toThrowError(
      PoCatalogError,
    );

    try {
      parsePo(readFixture('duplicate-active.po'), 'duplicate-active.po');
    } catch (error) {
      expect(error).toBeInstanceOf(PoCatalogError);
      expect((error as PoCatalogError).code).toBe('invalid-po');
    }
  });

  it('rejects active and obsolete twins for the same logical key', () => {
    expect(() =>
      parsePo(readFixture('active-obsolete-duplicate.po'), 'active-obsolete-duplicate.po'),
    ).toThrowError(PoCatalogError);

    try {
      parsePo(readFixture('active-obsolete-duplicate.po'), 'active-obsolete-duplicate.po');
    } catch (error) {
      expect(error).toBeInstanceOf(PoCatalogError);
      expect((error as PoCatalogError).code).toBe('active-obsolete-duplicate');
    }
  });

  it('rejects invalid bare obsolete lines that do not form real PO entries', () => {
    const po = '#~ Resend the actual WooCommerce processing email for a selected customer order.\n';

    expect(() => parsePo(po, 'invalid-obsolete.po')).toThrowError(PoCatalogError);

    try {
      parsePo(po, 'invalid-obsolete.po');
    } catch (error) {
      expect(error).toBeInstanceOf(PoCatalogError);
      expect((error as PoCatalogError).code).toBe('invalid-po');
    }
  });

  it('parses WordPress make-pot plural entries even without PO plural-form validation', () => {
    const pot = `msgid ""
msgstr ""
"Project-Id-Version: PACKAGE VERSION\\n"
"POT-Creation-Date: 2026-06-12 10:00+0000\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"

#. translators: %d: remaining spot count.
#: inc/Acme/Modules/OrderOverview.php:784
#, php-format
msgid "%d spot left"
msgid_plural "%d spots left"
msgstr[0] ""
msgstr[1] ""
`;

    const result = parsePot(pot, 'acme-orders.pot');
    const entry = result.entries.find((item) => item.msgid === '%d spot left');

    expect(entry).toBeDefined();
    expect(entry?.msgidPlural).toBe('%d spots left');
    expect(entry?.msgstrPlural).toEqual(['', '']);
    expect(entry?.comments.reference).toBe('inc/Acme/Modules/OrderOverview.php:784');
    expect(entry?.comments.flag).toBe('php-format');
  });
});
