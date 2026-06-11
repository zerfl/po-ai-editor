import { createContext, useContext, useReducer, useMemo, type ReactNode } from 'react';
import type { PoEntry, PoFile } from '@po-ai-editor/shared';

interface PoState {
  file: PoFile | null;
  selectedEntryId: string | null;
  selectedEntryIds: Set<string>;
  filter: 'all' | 'translated' | 'untranslated' | 'fuzzy' | 'obsolete';
  searchQuery: string;
}

type PoAction =
  | { type: 'LOAD_FILE'; payload: PoFile }
  | { type: 'RESET_FILE' }
  | { type: 'SELECT_ENTRY'; payload: string }
  | { type: 'TOGGLE_ENTRY'; payload: string }
  | { type: 'SELECT_ALL' }
  | { type: 'DESELECT_ALL' }
  | { type: 'SELECT_BY_STATUS'; payload: PoState['filter'] }
  | { type: 'UPDATE_ENTRY'; payload: { id: string; msgstr: string } }
  | { type: 'UPDATE_ENTRY_PLURAL'; payload: { id: string; index: number; msgstr: string } }
  | { type: 'SET_FILTER'; payload: PoState['filter'] }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'APPLY_SUGGESTIONS'; payload: Array<{ id: string; msgstr: string; plural?: string[] }> }
  | { type: 'MERGE_ENTRIES'; payload: PoFile };

const initialState: PoState = {
  file: null,
  selectedEntryId: null,
  selectedEntryIds: new Set(),
  filter: 'all',
  searchQuery: '',
};

function poReducer(state: PoState, action: PoAction): PoState {
  switch (action.type) {
    case 'LOAD_FILE':
      return {
        ...state,
        file: action.payload,
        selectedEntryId: null,
        selectedEntryIds: new Set(),
      };

    case 'RESET_FILE':
      return {
        ...initialState,
      };

    case 'SELECT_ENTRY':
      return { ...state, selectedEntryId: action.payload };

    case 'TOGGLE_ENTRY': {
      const newSet = new Set(state.selectedEntryIds);
      if (newSet.has(action.payload)) {
        newSet.delete(action.payload);
      } else {
        newSet.add(action.payload);
      }
      return { ...state, selectedEntryIds: newSet };
    }

    case 'SELECT_ALL': {
      if (!state.file) return state;
      const filtered = getFilteredEntries(state);
      return {
        ...state,
        selectedEntryIds: new Set(filtered.map((e) => e.id)),
      };
    }

    case 'DESELECT_ALL':
      return { ...state, selectedEntryIds: new Set() };

    case 'SELECT_BY_STATUS': {
      if (!state.file) return state;
      const matching = state.file.entries.filter((e) => statusMatch(e, action.payload));
      if (matching.length === 0) return state;
      const allSelected = matching.every((e) => state.selectedEntryIds.has(e.id));
      if (allSelected) {
        const removeIds = new Set(matching.map((e) => e.id));
        return {
          ...state,
          selectedEntryIds: new Set([...state.selectedEntryIds].filter((id) => !removeIds.has(id))),
        };
      }
      return {
        ...state,
        selectedEntryIds: new Set(matching.map((e) => e.id)),
      };
    }

    case 'UPDATE_ENTRY': {
      if (!state.file) return state;
      return {
        ...state,
        file: {
          ...state.file,
          entries: state.file.entries.map((e) =>
            e.id === action.payload.id
              ? {
                  ...e,
                  msgstr: action.payload.msgstr,
                  isTranslated: action.payload.msgstr.length > 0,
                }
              : e,
          ),
        },
      };
    }

    case 'UPDATE_ENTRY_PLURAL': {
      if (!state.file) return state;
      return {
        ...state,
        file: {
          ...state.file,
          entries: state.file.entries.map((e) => {
            if (e.id !== action.payload.id) return e;
            const newPlural = [...e.msgstrPlural];
            newPlural[action.payload.index] = action.payload.msgstr;
            return { ...e, msgstrPlural: newPlural };
          }),
        },
      };
    }

    case 'SET_FILTER':
      return { ...state, filter: action.payload };

    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };

    case 'APPLY_SUGGESTIONS': {
      if (!state.file) return state;
      const suggestionMap = new Map(action.payload.map((s) => [s.id, s]));
      return {
        ...state,
        file: {
          ...state.file,
          entries: state.file.entries.map((e) => {
            const suggestion = suggestionMap.get(e.id);
            if (!suggestion) return e;
            return {
              ...e,
              msgstr: suggestion.msgstr,
              msgstrPlural: suggestion.plural || e.msgstrPlural,
              isTranslated: true,
              isFuzzy: false,
            };
          }),
        },
      };
    }

    case 'MERGE_ENTRIES': {
      if (!state.file) return state;
      const existingMap = new Map(state.file.entries.map((e) => [e.msgid, e]));
      const mergedEntries = action.payload.entries.map((newEntry) => {
        const existing = existingMap.get(newEntry.msgid);
        if (existing) {
          return {
            ...existing,
            comments: newEntry.comments,
          };
        }
        return { ...newEntry, msgstr: '', isTranslated: false };
      });
      const newMsgidSet = new Set(action.payload.entries.map((e) => e.msgid));
      const obsoleteEntries = state.file.entries.flatMap((e) =>
        newMsgidSet.has(e.msgid) ? [] : [{ ...e, isObsolete: true }],
      );

      return {
        ...state,
        file: {
          ...state.file,
          entries: [...mergedEntries, ...obsoleteEntries],
        },
      };
    }

    default:
      return state;
  }
}

export function statusMatch(entry: PoEntry, status: PoState['filter']): boolean {
  return (
    status === 'all' ||
    (status === 'translated' && entry.isTranslated && !entry.isFuzzy) ||
    (status === 'untranslated' && !entry.isTranslated) ||
    (status === 'fuzzy' && entry.isFuzzy) ||
    (status === 'obsolete' && entry.isObsolete)
  );
}

function getFilteredEntries(state: PoState): PoEntry[] {
  if (!state.file) return [];
  const q = state.searchQuery ? state.searchQuery.toLowerCase() : '';

  return state.file.entries.filter((e) => {
    if (!statusMatch(e, state.filter)) return false;
    if (!q) return true;

    return (
      e.msgid.toLowerCase().includes(q) ||
      e.msgstr.toLowerCase().includes(q) ||
      (e.msgctxt !== null && e.msgctxt.toLowerCase().includes(q))
    );
  });
}

interface PoContextValue {
  state: PoState;
  dispatch: React.Dispatch<PoAction>;
  filteredEntries: PoEntry[];
}

const PoContext = createContext<PoContextValue | null>(null);

export function PoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(poReducer, initialState);
  const filteredEntries = useMemo(
    () => getFilteredEntries(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only recompute on filter/search/file changes, not selectedEntryId
    [state.file, state.filter, state.searchQuery],
  );

  const value = useMemo(
    () => ({ state, dispatch, filteredEntries }),
    [state, dispatch, filteredEntries],
  );

  return <PoContext.Provider value={value}>{children}</PoContext.Provider>;
}

export function usePoStore() {
  const ctx = useContext(PoContext);
  if (!ctx) throw new Error('usePoStore must be used within PoProvider');
  return ctx;
}
