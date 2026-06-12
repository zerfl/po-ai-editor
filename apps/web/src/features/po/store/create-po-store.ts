import { createStore } from 'zustand/vanilla';
import {
  getPoEntryKey,
  joinFlagComment,
  splitFlagComment,
  type PoEntry,
  type PoFile,
  type PoMetadata,
} from '@po-ai-editor/shared';
import { getFilteredEntryIds, statusMatch } from './derive';

export type PoFilter = 'all' | 'translated' | 'untranslated' | 'fuzzy' | 'obsolete';

export interface PoDocument {
  filename: string;
  metadata: PoMetadata;
  entryOrder: string[];
  entriesById: Record<string, PoEntry>;
}

export interface PoStoreState {
  document: PoDocument | null;
  selectedEntryId: string | null;
  selectedIds: Set<string>;
  filter: PoFilter;
  searchQuery: string;
}

export interface PoStoreActions {
  loadFile: (file: PoFile) => void;
  resetFile: () => void;
  selectEntry: (id: string) => void;
  toggleEntry: (id: string) => void;
  selectAllVisible: () => void;
  deselectAll: () => void;
  selectByStatus: (status: PoFilter) => void;
  updateEntry: (payload: { id: string; msgstr: string }) => void;
  updateEntryPlural: (payload: { id: string; index: number; msgstr: string }) => void;
  setFilter: (filter: PoFilter) => void;
  setSearchQuery: (query: string) => void;
  applySuggestions: (payload: Array<{ id: string; msgstr: string; plural?: string[] }>) => void;
  mergeEntries: (file: PoFile) => void;
}

export type PoStore = PoStoreState & PoStoreActions;

const initialState: PoStoreState = {
  document: null,
  selectedEntryId: null,
  selectedIds: new Set(),
  filter: 'all',
  searchQuery: '',
};

function isHeaderEntry(entry: Pick<PoEntry, 'msgctxt' | 'msgid'>): boolean {
  return entry.msgctxt === null && entry.msgid === '';
}

function deriveIsTranslated(entry: Pick<PoEntry, 'msgstr' | 'msgstrPlural'>): boolean {
  return entry.msgstr.length > 0 || entry.msgstrPlural.some((value) => value.length > 0);
}

function pluralSlotCount(pluralForms: string): number {
  const match = pluralForms.match(/nplurals\s*=\s*(\d+)/);
  const count = Number(match?.[1] ?? '2');
  return Number.isFinite(count) && count > 0 ? count : 2;
}

function emptyPluralTranslations(entry: Pick<PoEntry, 'msgidPlural' | 'msgstrPlural'>, metadata: PoMetadata) {
  if (!entry.msgidPlural) return [];
  const count = entry.msgstrPlural.length > 0 ? entry.msgstrPlural.length : pluralSlotCount(metadata.pluralForms);
  return Array.from({ length: count }, () => '');
}

function sourceFlags(flag?: string): string[] {
  return splitFlagComment(flag).filter((value) => value !== 'fuzzy');
}

function mergedSourceFlag(existing: PoEntry | null, incoming: PoEntry): string | undefined {
  return joinFlagComment([
    ...(existing?.isFuzzy ? ['fuzzy'] : []),
    ...sourceFlags(incoming.comments.flag),
  ]);
}

function sameComments(left: PoEntry['comments'], right: PoEntry['comments']): boolean {
  return (
    left.translator === right.translator &&
    left.extracted === right.extracted &&
    left.reference === right.reference &&
    left.flag === right.flag &&
    left.previous === right.previous
  );
}

function duplicateEntryError(prefix: string, entry: PoEntry, duplicateId: string): Error {
  return new Error(
    `${prefix}: duplicate logical entry for msgid "${entry.msgid}" in context ${JSON.stringify(entry.msgctxt)} (${duplicateId}, ${entry.id})`,
  );
}

function assertValidEntries(entries: PoEntry[], prefix: string): void {
  const seenIds = new Set<string>();
  const activeByKey = new Map<string, string>();
  const obsoleteByKey = new Map<string, string>();

  for (const entry of entries) {
    if (seenIds.has(entry.id)) {
      throw new Error(`${prefix}: duplicate entry id "${entry.id}"`);
    }
    seenIds.add(entry.id);

    const key = getPoEntryKey(entry);
    if (entry.isObsolete) {
      const activeId = activeByKey.get(key);
      if (activeId) {
        throw new Error(
          `${prefix}: active and obsolete entries share the same key for msgid "${entry.msgid}"`,
        );
      }

      const duplicateId = obsoleteByKey.get(key);
      if (duplicateId) {
        throw duplicateEntryError(prefix, entry, duplicateId);
      }

      obsoleteByKey.set(key, entry.id);
      continue;
    }

    const obsoleteId = obsoleteByKey.get(key);
    if (obsoleteId) {
      throw new Error(
        `${prefix}: active and obsolete entries share the same key for msgid "${entry.msgid}"`,
      );
    }

    const duplicateId = activeByKey.get(key);
    if (duplicateId) {
      throw duplicateEntryError(prefix, entry, duplicateId);
    }

    activeByKey.set(key, entry.id);
  }
}

function normalizePoFile(file: PoFile): PoDocument {
  assertValidEntries(file.entries, 'Loaded document');
  return {
    filename: file.filename,
    metadata: file.metadata,
    entryOrder: file.entries.map((entry) => entry.id),
    entriesById: Object.fromEntries(file.entries.map((entry) => [entry.id, entry])),
  };
}

function withDocument(
  state: PoStoreState,
  updater: (document: PoDocument) => PoDocument | null,
): Partial<PoStoreState> | PoStoreState {
  if (!state.document) return state;
  const document = updater(state.document);
  if (!document) return state;
  return { document };
}

function mergeTemplateEntry(existing: PoEntry, incoming: PoEntry, metadata: PoMetadata): PoEntry {
  const compatiblePluralShape =
    existing.msgidPlural === incoming.msgidPlural &&
    (incoming.msgidPlural === null || existing.msgstrPlural.length === emptyPluralTranslations(incoming, metadata).length);

  if (!compatiblePluralShape) {
    return {
      ...incoming,
      id: existing.id,
      msgstr: '',
      msgstrPlural: emptyPluralTranslations(incoming, metadata),
      comments: {
        translator: existing.comments.translator,
        extracted: incoming.comments.extracted,
        reference: incoming.comments.reference,
        flag: mergedSourceFlag(existing, incoming),
        previous: existing.comments.previous,
      },
      isFuzzy: existing.isFuzzy,
      isObsolete: false,
      isTranslated: false,
    };
  }

  const msgstrPlural = existing.msgidPlural ? [...existing.msgstrPlural] : [];

  const merged: PoEntry = {
    ...existing,
    msgctxt: incoming.msgctxt,
    msgid: incoming.msgid,
    msgidPlural: incoming.msgidPlural,
    msgstrPlural,
    comments: {
      translator: existing.comments.translator,
      extracted: incoming.comments.extracted,
      reference: incoming.comments.reference,
      flag: mergedSourceFlag(existing, incoming),
      previous: existing.comments.previous,
    },
    isObsolete: false,
    isTranslated: deriveIsTranslated({
      msgstr: existing.msgstr,
      msgstrPlural,
    }),
  };

  if (
    !existing.isObsolete &&
    existing.msgctxt === merged.msgctxt &&
    existing.msgid === merged.msgid &&
    existing.msgidPlural === merged.msgidPlural &&
    existing.msgstr === merged.msgstr &&
    existing.isFuzzy === merged.isFuzzy &&
    existing.isTranslated === merged.isTranslated &&
    existing.msgstrPlural.length === merged.msgstrPlural.length &&
    existing.msgstrPlural.every((value, index) => value === merged.msgstrPlural[index]) &&
    sameComments(existing.comments, merged.comments)
  ) {
    return existing;
  }

  return merged;
}

function createNewTemplateEntry(incoming: PoEntry, metadata: PoMetadata): PoEntry {
  const msgstrPlural = emptyPluralTranslations(incoming, metadata);
  return {
    ...incoming,
    msgstr: '',
    msgstrPlural,
    comments: {
      ...incoming.comments,
      flag: joinFlagComment(sourceFlags(incoming.comments.flag)),
    },
    isFuzzy: false,
    isObsolete: false,
    isTranslated: false,
  };
}

export function createPoStore() {
  return createStore<PoStore>()((set) => ({
    ...initialState,

    loadFile: (file) => {
      set((state) => ({
        ...state,
        document: normalizePoFile(file),
        selectedEntryId: null,
        selectedIds: new Set(),
      }));
    },

    resetFile: () => {
      set(() => ({ ...initialState, selectedIds: new Set() }));
    },

    selectEntry: (id) => {
      set(() => ({ selectedEntryId: id }));
    },

    toggleEntry: (id) => {
      set((state) => {
        const selectedIds = new Set(state.selectedIds);
        if (selectedIds.has(id)) {
          selectedIds.delete(id);
        } else {
          selectedIds.add(id);
        }
        return { selectedIds };
      });
    },

    selectAllVisible: () => {
      set((state) => {
        if (!state.document) return state;
        return { selectedIds: new Set(getFilteredEntryIds(state)) };
      });
    },

    deselectAll: () => {
      set(() => ({ selectedIds: new Set() }));
    },

    selectByStatus: (status) => {
      set((state) => {
        const document = state.document;
        if (!document) return state;

        const matchingIds = document.entryOrder.filter((id) =>
          statusMatch(document.entriesById[id], status),
        );

        if (matchingIds.length === 0) return state;

        const allSelected = matchingIds.every((id) => state.selectedIds.has(id));
        if (allSelected) {
          const removeIds = new Set(matchingIds);
          return {
            selectedIds: new Set([...state.selectedIds].filter((id) => !removeIds.has(id))),
          };
        }

        return { selectedIds: new Set(matchingIds) };
      });
    },

    updateEntry: (payload) => {
      set((state) => {
        const nextState = withDocument(state, (document) => {
          const current = document.entriesById[payload.id];
          if (!current) return document;

          const nextIsTranslated = payload.msgstr.length > 0;
          if (current.msgstr === payload.msgstr && current.isTranslated === nextIsTranslated) {
            return document;
          }

          return {
            ...document,
            entriesById: {
              ...document.entriesById,
              [payload.id]: {
                ...current,
                msgstr: payload.msgstr,
                isTranslated: nextIsTranslated,
              },
            },
          };
        });

        return nextState;
      });
    },

    updateEntryPlural: (payload) => {
      set((state) => {
        const nextState = withDocument(state, (document) => {
          const current = document.entriesById[payload.id];
          if (!current) return document;

          const nextPlural = [...current.msgstrPlural];
          if (nextPlural[payload.index] === payload.msgstr) return document;

          nextPlural[payload.index] = payload.msgstr;

          return {
            ...document,
            entriesById: {
              ...document.entriesById,
              [payload.id]: {
                ...current,
                msgstrPlural: nextPlural,
                isTranslated: nextPlural.some((value) => value.length > 0),
              },
            },
          };
        });

        return nextState;
      });
    },

    setFilter: (filter) => {
      set(() => ({ filter }));
    },

    setSearchQuery: (query) => {
      set(() => ({ searchQuery: query }));
    },

    applySuggestions: (payload) => {
      set((state) => {
        const nextState = withDocument(state, (document) => {
          const suggestions = new Map(payload.map((suggestion) => [suggestion.id, suggestion]));
          let nextEntriesById: Record<string, PoEntry> | null = null;

          for (const id of document.entryOrder) {
            const current = document.entriesById[id];
            const suggestion = suggestions.get(id);
            if (!suggestion) continue;

            const nextPlural = suggestion.plural ?? current.msgstrPlural;
            const nextEntry: PoEntry = {
              ...current,
              msgstr: suggestion.msgstr,
              msgstrPlural: nextPlural,
              isTranslated: true,
              isFuzzy: false,
            };

            if (
              current.msgstr === nextEntry.msgstr &&
              current.msgstrPlural === nextEntry.msgstrPlural &&
              current.isTranslated === nextEntry.isTranslated &&
              current.isFuzzy === nextEntry.isFuzzy
            ) {
              continue;
            }

            if (!nextEntriesById) {
              nextEntriesById = { ...document.entriesById };
            }
            nextEntriesById[id] = nextEntry;
          }

          if (!nextEntriesById) return document;

          return {
            ...document,
            entriesById: nextEntriesById,
          };
        });

        return nextState;
      });
    },

    mergeEntries: (file) => {
      set((state) => {
        const nextState = withDocument(state, (document) => {
          const currentEntries = document.entryOrder.map((id) => document.entriesById[id]);
          assertValidEntries(currentEntries, 'Current document');

          const incomingEntries = file.entries.filter((entry) => !isHeaderEntry(entry));
          assertValidEntries(incomingEntries, 'Incoming POT');

          const headerEntries = currentEntries.filter((entry) => isHeaderEntry(entry));
          const activeByKey = new Map<string, PoEntry>();
          const obsoleteByKey = new Map<string, PoEntry>();

          for (const entry of currentEntries) {
            if (isHeaderEntry(entry)) continue;
            const key = getPoEntryKey(entry);
            if (entry.isObsolete) {
              obsoleteByKey.set(key, entry);
            } else {
              activeByKey.set(key, entry);
            }
          }

          const mergedEntries = incomingEntries.map((incomingEntry) => {
            const key = getPoEntryKey(incomingEntry);
            const existing = activeByKey.get(key) ?? obsoleteByKey.get(key) ?? null;

            if (!existing) {
              return createNewTemplateEntry(incomingEntry, document.metadata);
            }

            return mergeTemplateEntry(existing, incomingEntry, document.metadata);
          });

          const nextActiveKeys = new Set(mergedEntries.map((entry) => getPoEntryKey(entry)));
          const obsoleteEntries = currentEntries.flatMap((entry) => {
            if (isHeaderEntry(entry)) return [];

            const key = getPoEntryKey(entry);
            if (nextActiveKeys.has(key)) return [];
            if (entry.isObsolete) return [entry];

            return [{ ...entry, isObsolete: true }];
          });

          const nextEntries = [...headerEntries, ...mergedEntries, ...obsoleteEntries];
          assertValidEntries(nextEntries, 'Merged document');
          return {
            ...document,
            entryOrder: nextEntries.map((entry) => entry.id),
            entriesById: Object.fromEntries(nextEntries.map((entry) => [entry.id, entry])),
          };
        });

        return nextState;
      });
    },
  }));
}
