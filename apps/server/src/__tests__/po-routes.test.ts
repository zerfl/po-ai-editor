import { describe, expect, it } from 'vitest';
import type { PoEntry, PoMetadata } from '@po-ai-editor/shared';
import { exportRoute } from '../routes/export';
import { parseRoute } from '../routes/parse';
import { readFixture } from './po-test-helpers';

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

const headerEntry: PoEntry = {
  id: 'header',
  msgctxt: null,
  msgid: '',
  msgidPlural: null,
  msgstr: '',
  msgstrPlural: [],
  comments: {},
  isFuzzy: false,
  isObsolete: false,
  isTranslated: true,
};

describe('PO routes', () => {
  it('returns a structured 400 from /parse for malformed duplicate active entries', async () => {
    const response = await parseRoute.request('/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: readFixture('duplicate-active.po'),
        filename: 'duplicate-active.po',
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'invalid-po',
    });
  });

  it('returns a structured 400 from /export/po for conflicting duplicate active entries', async () => {
    const response = await exportRoute.request('/export/po', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: sampleMetadata,
        entries: [
          headerEntry,
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
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'duplicate-entry-conflict',
    });
  });
});
