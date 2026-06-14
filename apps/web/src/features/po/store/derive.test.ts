import { describe, expect, it } from 'vitest';
import { createPoStore } from './create-po-store';
import { getFilteredEntryIds, getSelectedVisibleEntries, statusMatch, toPoFile } from './derive';
import { testPoFile } from './test-fixtures';

describe('po store derivations', () => {
  it('matches entries by status', () => {
    const [welcome, save, archive, , legacy] = testPoFile.entries;

    expect(statusMatch(welcome, 'untranslated')).toBe(true);
    expect(statusMatch(save, 'translated')).toBe(true);
    expect(statusMatch(archive, 'fuzzy')).toBe(true);
    expect(statusMatch(legacy, 'obsolete')).toBe(true);
    expect(statusMatch(save, 'obsolete')).toBe(false);
  });

  it('filters entry ids by status and search query', () => {
    const store = createPoStore();
    store.getState().loadFile(testPoFile);

    expect(getFilteredEntryIds(store.getState())).toEqual(
      testPoFile.entries.map((entry) => entry.id),
    );

    store.getState().setFilter('translated');
    expect(getFilteredEntryIds(store.getState())).toEqual(['entry-save', 'entry-legacy']);

    store.getState().setFilter('all');
    store.getState().setSearchQuery('archive');
    expect(getFilteredEntryIds(store.getState())).toEqual(['entry-archive']);

    store.getState().setSearchQuery('dashboard');
    expect(getFilteredEntryIds(store.getState())).toEqual(['entry-welcome']);
  });

  it('returns only selected entries that are still visible', () => {
    const store = createPoStore();
    store.getState().loadFile(testPoFile);
    store.getState().toggleEntry('entry-save');
    store.getState().toggleEntry('entry-archive');
    store.getState().setFilter('translated');

    expect(getSelectedVisibleEntries(store.getState()).map((entry) => entry.id)).toEqual([
      'entry-save',
    ]);

    store.getState().setSearchQuery('archive');
    expect(getSelectedVisibleEntries(store.getState()).map((entry) => entry.id)).toEqual([]);
  });

  it('reconstructs a po file from normalized state', () => {
    const store = createPoStore();
    store.getState().loadFile(testPoFile);
    store.getState().updateEntry({ id: 'entry-welcome', msgstr: 'Willkommen' });
    store.getState().setLanguage('fr_FR');

    const file = toPoFile(store.getState());

    expect(file?.filename).toBe(testPoFile.filename);
    expect(file?.metadata).toEqual({ ...testPoFile.metadata, language: 'fr_FR' });
    expect(file?.entries.map((entry) => entry.id)).toEqual(
      testPoFile.entries.map((entry) => entry.id),
    );
    expect(file?.entries.find((entry) => entry.id === 'entry-welcome')?.msgstr).toBe('Willkommen');
  });
});
