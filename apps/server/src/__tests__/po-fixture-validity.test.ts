import { describe, expect, it } from 'vitest';
import { parsePo } from '../services/po-parser';
import { PoCatalogError } from '../services/po-errors';
import { serializePo } from '../services/po-serializer';
import { assertMsgfmtValidPo, readFixture } from './po-test-helpers';

describe('po fixture validity', () => {
  it.each([
    'wordpress-valid.po',
    'obsolete-history.po',
    'repeated-references.po',
    'empty-context.po',
  ])('round-trips %s through parse and serialize and stays msgfmt-valid', (fixtureName) => {
    const parsed = parsePo(readFixture(fixtureName), fixtureName);
    const serialized = serializePo(parsed.entries, parsed.metadata);

    expect(() => parsePo(serialized, `${fixtureName}.roundtrip`)).not.toThrow();
    assertMsgfmtValidPo(serialized);
  });

  it.each(['duplicate-active.po', 'active-obsolete-duplicate.po'])(
    'rejects malformed fixture %s with a structured PO error',
    (fixtureName) => {
      expect(() => parsePo(readFixture(fixtureName), fixtureName)).toThrowError(PoCatalogError);
    },
  );
});
