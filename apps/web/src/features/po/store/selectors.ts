import { getFilteredEntryIds, getSelectedVisibleEntries } from './derive';
import type { PoStore } from './create-po-store';

export const selectDocument = (state: PoStore) => state.document;
export const selectHasFile = (state: PoStore) => state.document !== null;
export const selectFilename = (state: PoStore) => state.document?.filename ?? null;
export const selectEntryCount = (state: PoStore) => state.document?.entryOrder.length ?? 0;
export const selectLanguage = (state: PoStore) => state.document?.metadata.language ?? '';
export const selectSelectedEntryId = (state: PoStore) => state.selectedEntryId;
export const selectSelectedIds = (state: PoStore) => state.selectedIds;
export const selectFilter = (state: PoStore) => state.filter;
export const selectSearchQuery = (state: PoStore) => state.searchQuery;
export const selectVisibleSelectedCount = (state: PoStore) =>
  getSelectedVisibleEntries(state).length;
export const selectFilteredEntryCount = (state: PoStore) => getFilteredEntryIds(state).length;

export const selectLoadFile = (state: PoStore) => state.loadFile;
export const selectResetFile = (state: PoStore) => state.resetFile;
export const selectSelectEntry = (state: PoStore) => state.selectEntry;
export const selectToggleEntry = (state: PoStore) => state.toggleEntry;
export const selectSelectAllVisible = (state: PoStore) => state.selectAllVisible;
export const selectDeselectAll = (state: PoStore) => state.deselectAll;
export const selectSelectByStatus = (state: PoStore) => state.selectByStatus;
export const selectUpdateEntry = (state: PoStore) => state.updateEntry;
export const selectUpdateEntryPlural = (state: PoStore) => state.updateEntryPlural;
export const selectSetLanguage = (state: PoStore) => state.setLanguage;
export const selectSetFilter = (state: PoStore) => state.setFilter;
export const selectSetSearchQuery = (state: PoStore) => state.setSearchQuery;
export const selectApplySuggestions = (state: PoStore) => state.applySuggestions;
export const selectMergeEntries = (state: PoStore) => state.mergeEntries;
