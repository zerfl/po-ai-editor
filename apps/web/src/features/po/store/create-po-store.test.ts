import { describe, expect, it } from 'vitest';
import { createPoStore } from './create-po-store';
import { getEntryById } from './derive';
import { mergePotFile, testPoFile } from './test-fixtures';

describe('createPoStore', () => {
  it('normalizes loaded files and clears active selection', () => {
    const store = createPoStore();

    store.getState().setFilter('fuzzy');
    store.getState().setSearchQuery('save');
    store.getState().selectEntry('entry-save');
    store.getState().toggleEntry('entry-save');
    store.getState().loadFile(testPoFile);

    const state = store.getState();
    expect(state.document?.entryOrder).toEqual(testPoFile.entries.map((entry) => entry.id));
    expect(state.document?.entriesById['entry-save']?.msgid).toBe('Save changes');
    expect(state.selectedEntryId).toBeNull();
    expect([...state.selectedIds]).toEqual([]);
    expect(state.filter).toBe('fuzzy');
    expect(state.searchQuery).toBe('save');
  });

  it('updates singular and plural entries while preserving untouched entry references', () => {
    const store = createPoStore();
    store.getState().loadFile(testPoFile);

    const beforeSave = getEntryById(store.getState(), 'entry-save');
    const beforePlural = getEntryById(store.getState(), 'entry-files');

    store.getState().updateEntry({ id: 'entry-welcome', msgstr: 'Willkommen zurueck' });
    store.getState().updateEntryPlural({ id: 'entry-files', index: 1, msgstr: 'Dateien' });

    const state = store.getState();
    expect(getEntryById(state, 'entry-welcome')?.msgstr).toBe('Willkommen zurueck');
    expect(getEntryById(state, 'entry-welcome')?.isTranslated).toBe(true);
    expect(getEntryById(state, 'entry-save')).toBe(beforeSave);
    expect(getEntryById(state, 'entry-files')?.msgstrPlural).toEqual(['', 'Dateien']);
    expect(getEntryById(state, 'entry-files')?.isTranslated).toBe(true);
    expect(getEntryById(state, 'entry-files')).not.toBe(beforePlural);
  });

  it('updates document language metadata for translation target and export', () => {
    const store = createPoStore();
    store.getState().loadFile(testPoFile);

    store.getState().setLanguage('fr_FR');

    const state = store.getState();
    expect(state.document?.metadata.language).toBe('fr_FR');
  });

  it('preserves blank language metadata for targetless template files', () => {
    const store = createPoStore();
    store.getState().loadFile({
      ...testPoFile,
      filename: 'messages.pot',
      metadata: {
        ...testPoFile.metadata,
        language: '',
      },
    });

    expect(store.getState().document?.metadata.language).toBe('');
  });

  it('supports selection helpers and suggestion application', () => {
    const store = createPoStore();
    store.getState().loadFile(testPoFile);
    store.getState().setFilter('untranslated');
    store.getState().selectAllVisible();

    expect([...store.getState().selectedIds]).toEqual(['entry-welcome', 'entry-files']);

    store.getState().deselectAll();
    store.getState().selectByStatus('fuzzy');
    expect([...store.getState().selectedIds]).toEqual(['entry-archive']);

    store.getState().applySuggestions([
      { id: 'entry-archive', msgstr: 'Projekt ins Archiv verschieben' },
      { id: 'entry-files', msgstr: '', plural: ['Datei', 'Dateien'] },
    ]);

    const state = store.getState();
    expect(getEntryById(state, 'entry-archive')?.isFuzzy).toBe(false);
    expect(getEntryById(state, 'entry-archive')?.isTranslated).toBe(true);
    expect(getEntryById(state, 'entry-files')?.msgstrPlural).toEqual(['Datei', 'Dateien']);
  });

  it('merges incoming template entries and marks removed entries obsolete', () => {
    const store = createPoStore();
    store.getState().loadFile(testPoFile);

    const existingWelcome = getEntryById(store.getState(), 'entry-welcome');
    store.getState().mergeEntries(mergePotFile);

    const state = store.getState();
    expect(state.document?.entryOrder).toEqual([
      'entry-welcome',
      'entry-save',
      'incoming-new',
      'entry-archive',
      'entry-files',
      'entry-legacy',
    ]);
    expect(getEntryById(state, 'entry-welcome')).toBe(existingWelcome);
    expect(getEntryById(state, 'entry-save')?.comments.extracted).toBe(
      'Updated primary button label',
    );
    expect(getEntryById(state, 'entry-save')?.comments.reference).toBe(
      'src/components/save.tsx:99',
    );
    expect(getEntryById(state, 'entry-save')?.comments.translator).toBe('CTA label');
    expect(getEntryById(state, 'entry-save')?.comments.flag).toBe('php-format');
    expect(getEntryById(state, 'incoming-new')?.msgstr).toBe('');
    expect(getEntryById(state, 'incoming-new')?.isTranslated).toBe(false);
    expect(getEntryById(state, 'entry-archive')?.isObsolete).toBe(true);
    expect(getEntryById(state, 'entry-files')?.isObsolete).toBe(true);
    expect(getEntryById(state, 'entry-legacy')?.isObsolete).toBe(true);
  });

  it('merges entries by logical key instead of raw msgid so contexts stay distinct', () => {
    const store = createPoStore();
    store.getState().loadFile({
      filename: 'messages.po',
      metadata: testPoFile.metadata,
      entries: [
        {
          id: 'button-post',
          msgctxt: 'button',
          msgid: 'Post',
          msgidPlural: null,
          msgstr: 'Senden',
          msgstrPlural: [],
          comments: { reference: 'old-button.php:1' },
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
        {
          id: 'noun-post',
          msgctxt: 'noun',
          msgid: 'Post',
          msgidPlural: null,
          msgstr: 'Beitrag',
          msgstrPlural: [],
          comments: { reference: 'old-noun.php:2' },
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      ],
    });

    store.getState().mergeEntries({
      filename: 'messages.pot',
      metadata: testPoFile.metadata,
      entries: [
        {
          id: 'incoming-button',
          msgctxt: 'button',
          msgid: 'Post',
          msgidPlural: null,
          msgstr: '',
          msgstrPlural: [],
          comments: { reference: 'new-button.php:10' },
          isFuzzy: false,
          isObsolete: false,
          isTranslated: false,
        },
        {
          id: 'incoming-noun',
          msgctxt: 'noun',
          msgid: 'Post',
          msgidPlural: null,
          msgstr: '',
          msgstrPlural: [],
          comments: { reference: 'new-noun.php:20' },
          isFuzzy: false,
          isObsolete: false,
          isTranslated: false,
        },
      ],
    });

    const state = store.getState();
    expect(state.document?.entryOrder).toEqual(['button-post', 'noun-post']);
    expect(getEntryById(state, 'button-post')?.msgstr).toBe('Senden');
    expect(getEntryById(state, 'button-post')?.comments.reference).toBe('new-button.php:10');
    expect(getEntryById(state, 'noun-post')?.msgstr).toBe('Beitrag');
    expect(getEntryById(state, 'noun-post')?.comments.reference).toBe('new-noun.php:20');
  });

  it('rejects malformed documents with duplicate active logical keys', () => {
    const store = createPoStore();

    expect(() => {
      store.getState().loadFile({
        filename: 'invalid.po',
        metadata: testPoFile.metadata,
        entries: [
          {
            id: 'dup-1',
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
            id: 'dup-2',
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
      });
    }).toThrow(/duplicate logical entry/);
  });

  it('resets document and query state back to initial values', () => {
    const store = createPoStore();
    store.getState().loadFile(testPoFile);
    store.getState().setFilter('translated');
    store.getState().setSearchQuery('legacy');
    store.getState().selectEntry('entry-legacy');
    store.getState().toggleEntry('entry-legacy');

    store.getState().resetFile();

    const state = store.getState();
    expect(state.document).toBeNull();
    expect(state.filter).toBe('all');
    expect(state.searchQuery).toBe('');
    expect(state.selectedEntryId).toBeNull();
    expect(state.selectedIds.size).toBe(0);
  });
});
