import { describe, expect, it } from 'vitest';
import type { PoEntry } from '@po-ai-editor/shared';
import { normalizePoEntries } from '../services/po-normalizer';
import { PoCatalogError } from '../services/po-errors';

function makeEntry(overrides: Partial<PoEntry>): PoEntry {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    msgctxt: overrides.msgctxt ?? null,
    msgid: overrides.msgid ?? 'Hello',
    msgidPlural: overrides.msgidPlural ?? null,
    msgstr: overrides.msgstr ?? 'Hallo',
    msgstrPlural: overrides.msgstrPlural ?? [],
    comments: overrides.comments ?? {},
    isFuzzy: overrides.isFuzzy ?? false,
    isObsolete: overrides.isObsolete ?? false,
    isTranslated: overrides.isTranslated ?? true,
  };
}

describe('po-normalizer', () => {
  it('merges safe duplicate active entries and accumulates references', () => {
    const normalized = normalizePoEntries([
      makeEntry({ id: '1', comments: { reference: 'a.php:1' } }),
      makeEntry({ id: '2', comments: { reference: 'b.php:2' } }),
    ]);

    expect(normalized.activeEntries).toHaveLength(1);
    expect(normalized.activeEntries[0]?.comments.reference).toBe('a.php:1\nb.php:2');
  });

  it('rejects duplicate active entries with conflicting translations', () => {
    expect(() =>
      normalizePoEntries([
        makeEntry({ id: '1', msgstr: 'Hallo' }),
        makeEntry({ id: '2', msgstr: 'Servus' }),
      ]),
    ).toThrowError(PoCatalogError);
  });

  it('drops obsolete twins when an active entry with the same key exists', () => {
    const normalized = normalizePoEntries([
      makeEntry({ id: '1', msgctxt: 'button', msgid: 'Post', msgstr: 'Senden' }),
      makeEntry({
        id: '2',
        msgctxt: 'button',
        msgid: 'Post',
        msgstr: 'Alt',
        isObsolete: true,
      }),
    ]);

    expect(normalized.activeEntries).toHaveLength(1);
    expect(normalized.obsoleteEntries).toHaveLength(0);
  });

  it('keeps same msgid values distinct across contexts', () => {
    const normalized = normalizePoEntries([
      makeEntry({ id: '1', msgctxt: null, msgid: 'Post', msgstr: 'Beitrag' }),
      makeEntry({ id: '2', msgctxt: 'button', msgid: 'Post', msgstr: 'Senden' }),
    ]);

    expect(normalized.activeEntries).toHaveLength(2);
  });

  it('keeps null context and explicit empty context separate', () => {
    const normalized = normalizePoEntries([
      makeEntry({ id: '1', msgctxt: null, msgid: 'Status', msgstr: 'Status' }),
      makeEntry({ id: '2', msgctxt: '', msgid: 'Status', msgstr: 'Leerer Kontext' }),
    ]);

    expect(normalized.activeEntries).toHaveLength(2);
  });
});
