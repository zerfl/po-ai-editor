import type { PoComment, PoEntry } from '@po-ai-editor/shared';
import {
  getPoEntryKey,
  joinFlagComment,
  mergeFlagComments,
  mergePoLineValues,
  mergeReferenceComments,
  splitFlagComment,
  withPoCommentDefaults,
} from '@po-ai-editor/shared';
import { PoCatalogError } from './po-errors.js';

export interface NormalizedPoCatalog {
  headerEntry: PoEntry | null;
  activeEntries: PoEntry[];
  obsoleteEntries: PoEntry[];
}

function cloneEntry(entry: PoEntry): PoEntry {
  return {
    ...entry,
    comments: withPoCommentDefaults(entry.comments),
    msgstrPlural: [...entry.msgstrPlural],
  };
}

export function isHeaderEntry(entry: Pick<PoEntry, 'msgctxt' | 'msgid'>): boolean {
  return entry.msgctxt === null && entry.msgid === '';
}

export function isEntryTranslated(entry: Pick<PoEntry, 'msgstr' | 'msgstrPlural'>): boolean {
  return entry.msgstr.length > 0 || entry.msgstrPlural.some((value) => value.length > 0);
}

function effectiveCommentFlags(entry: PoEntry): string[] {
  const nonFuzzyFlags = splitFlagComment(entry.comments.flag).filter((flag) => flag !== 'fuzzy');
  return entry.isFuzzy ? ['fuzzy', ...nonFuzzyFlags] : nonFuzzyFlags;
}

function samePluralTranslations(left: PoEntry, right: PoEntry): boolean {
  if (left.msgstrPlural.length !== right.msgstrPlural.length) {
    return false;
  }

  return left.msgstrPlural.every((value, index) => value === right.msgstrPlural[index]);
}

function mergedComments(entries: PoEntry[], isFuzzy: boolean): PoComment {
  const mergedFlags = mergeFlagComments(
    ...entries.map((entry) => joinFlagComment(effectiveCommentFlags(entry).filter((flag) => flag !== 'fuzzy'))),
  );

  const flag = joinFlagComment([
    ...(isFuzzy ? ['fuzzy'] : []),
    ...splitFlagComment(mergedFlags),
  ]);

  return {
    translator: mergePoLineValues(...entries.map((entry) => entry.comments.translator)),
    extracted: mergePoLineValues(...entries.map((entry) => entry.comments.extracted)),
    reference: mergeReferenceComments(...entries.map((entry) => entry.comments.reference)),
    flag,
    previous: mergePoLineValues(...entries.map((entry) => entry.comments.previous)),
  };
}

function duplicateConflict(entries: PoEntry[], reason: string): never {
  const [entry] = entries;
  throw new PoCatalogError(
    'normalize',
    'duplicate-entry-conflict',
    `Conflicting duplicate entries for "${entry.msgid}" cannot be merged safely`,
    {
      reason,
      msgctxt: entry.msgctxt,
      msgid: entry.msgid,
      duplicateIds: entries.map((item) => item.id),
    },
  );
}

function mergeEntryGroup(entries: PoEntry[]): PoEntry {
  const canonical = cloneEntry(entries[0]);
  const hasFuzzy = entries.some((entry) => entry.isFuzzy);

  for (let index = 1; index < entries.length; index += 1) {
    const next = entries[index];

    if (canonical.msgidPlural !== next.msgidPlural) {
      duplicateConflict(entries, 'msgid_plural mismatch');
    }

    if (canonical.msgstr !== next.msgstr) {
      duplicateConflict(entries, 'msgstr mismatch');
    }

    if (!samePluralTranslations(canonical, next)) {
      duplicateConflict(entries, 'msgstr plural mismatch');
    }
  }

  canonical.comments = mergedComments(entries, hasFuzzy);
  canonical.isFuzzy = hasFuzzy;
  canonical.isTranslated = isEntryTranslated(canonical);

  return canonical;
}

function entriesByLogicalKey(entries: PoEntry[]): Map<string, PoEntry[]> {
  const groups = new Map<string, PoEntry[]>();

  for (const entry of entries) {
    const key = getPoEntryKey(entry);
    const current = groups.get(key);
    if (current) {
      current.push(entry);
      continue;
    }
    groups.set(key, [entry]);
  }

  return groups;
}

export function assertNoActiveObsoleteKeyOverlap(entries: PoEntry[]): void {
  const activeKeys = new Map<string, PoEntry>();

  for (const entry of entries) {
    if (entry.isObsolete || isHeaderEntry(entry)) continue;
    activeKeys.set(getPoEntryKey(entry), entry);
  }

  for (const entry of entries) {
    if (!entry.isObsolete || isHeaderEntry(entry)) continue;
    const active = activeKeys.get(getPoEntryKey(entry));
    if (!active) continue;

    throw new PoCatalogError(
      'parse',
      'active-obsolete-duplicate',
      `Active and obsolete entries for "${entry.msgid}" share the same catalog key`,
      {
        msgctxt: entry.msgctxt,
        msgid: entry.msgid,
        activeId: active.id,
        obsoleteId: entry.id,
      },
    );
  }
}

export function normalizePoEntries(entries: PoEntry[]): NormalizedPoCatalog {
  const groups = entriesByLogicalKey(entries);
  let headerEntry: PoEntry | null = null;
  const activeEntries: PoEntry[] = [];
  const obsoleteEntries: PoEntry[] = [];

  for (const group of groups.values()) {
    const activeGroup = group.filter((entry) => !entry.isObsolete);
    const obsoleteGroup = group.filter((entry) => entry.isObsolete);

    const mergedActive = activeGroup.length > 0 ? mergeEntryGroup(activeGroup) : null;
    const mergedObsolete = obsoleteGroup.length > 0 ? mergeEntryGroup(obsoleteGroup) : null;

    if (mergedActive && isHeaderEntry(mergedActive)) {
      if (headerEntry) {
        throw new PoCatalogError(
          'normalize',
          'duplicate-header-entry',
          'Multiple header entries were provided for export',
          {
            duplicateIds: [headerEntry.id, mergedActive.id],
          },
        );
      }

      headerEntry = mergedActive;
      continue;
    }

    if (mergedActive) {
      activeEntries.push(mergedActive);
    }

    if (mergedObsolete && !mergedActive) {
      obsoleteEntries.push(mergedObsolete);
    }
  }

  return { headerEntry, activeEntries, obsoleteEntries };
}
