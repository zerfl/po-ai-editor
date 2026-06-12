import { describe, expect, it } from 'vitest';
import { summarizePotMergeChanges } from './PotLoader';
import { mergePotFile, testPoFile } from '../po/store/test-fixtures';

describe('summarizePotMergeChanges', () => {
  it('counts added and removed entries by logical key and ignores obsolete history', () => {
    const document = {
      filename: testPoFile.filename,
      metadata: testPoFile.metadata,
      entryOrder: testPoFile.entries.map((entry) => entry.id),
      entriesById: Object.fromEntries(testPoFile.entries.map((entry) => [entry.id, entry])),
    };

    expect(summarizePotMergeChanges(document, mergePotFile)).toEqual({
      added: 1,
      removed: 2,
    });
  });

  it('treats same msgid values in different contexts as distinct changes', () => {
    const document = {
      filename: 'messages.po',
      metadata: testPoFile.metadata,
      entryOrder: ['button-post', 'noun-post'],
      entriesById: {
        'button-post': {
          id: 'button-post',
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
        'noun-post': {
          id: 'noun-post',
          msgctxt: 'noun',
          msgid: 'Post',
          msgidPlural: null,
          msgstr: 'Beitrag',
          msgstrPlural: [],
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: true,
        },
      },
    };

    const incoming = {
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
          comments: {},
          isFuzzy: false,
          isObsolete: false,
          isTranslated: false,
        },
      ],
    };

    expect(summarizePotMergeChanges(document, incoming)).toEqual({
      added: 0,
      removed: 1,
    });
  });
});
