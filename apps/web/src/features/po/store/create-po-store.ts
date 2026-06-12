import { createStore } from 'zustand/vanilla';
import type { PoEntry, PoFile, PoMetadata } from '@po-ai-editor/shared';
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

function normalizePoFile(file: PoFile): PoDocument {
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

function sameComments(left: PoEntry['comments'], right: PoEntry['comments']) {
  return (
    left.translator === right.translator &&
    left.extracted === right.extracted &&
    left.reference === right.reference &&
    left.flag === right.flag
  );
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
          const existingByMsgid = new Map(
            document.entryOrder.map((id) => {
              const entry = document.entriesById[id];
              return [entry.msgid, entry] as const;
            }),
          );

          const mergedEntries = file.entries.map((incomingEntry) => {
            const existing = existingByMsgid.get(incomingEntry.msgid);
            if (!existing) {
              return { ...incomingEntry, msgstr: '', isTranslated: false };
            }

            if (sameComments(existing.comments, incomingEntry.comments)) {
              return existing;
            }

            return {
              ...existing,
              comments: incomingEntry.comments,
            };
          });

          const nextMsgids = new Set(file.entries.map((entry) => entry.msgid));
          const obsoleteEntries = document.entryOrder.flatMap((id) => {
            const current = document.entriesById[id];
            if (nextMsgids.has(current.msgid)) return [];
            if (current.isObsolete) return [current];
            return [{ ...current, isObsolete: true }];
          });

          const nextEntries = [...mergedEntries, ...obsoleteEntries];
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
