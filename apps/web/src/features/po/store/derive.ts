import type { PoEntry, PoFile } from '@po-ai-editor/shared';
import type { PoDocument, PoFilter, PoStoreState } from './create-po-store';

export function statusMatch(entry: PoEntry, status: PoFilter): boolean {
  return (
    status === 'all' ||
    (status === 'translated' && entry.isTranslated && !entry.isFuzzy) ||
    (status === 'untranslated' && !entry.isTranslated) ||
    (status === 'fuzzy' && entry.isFuzzy) ||
    (status === 'obsolete' && entry.isObsolete)
  );
}

function getDocumentEntries(document: PoDocument): PoEntry[] {
  return document.entryOrder.map((id) => document.entriesById[id]);
}

export function getEntryById(state: Pick<PoStoreState, 'document'>, id: string) {
  return state.document?.entriesById[id];
}

export function getFilteredEntryIds(
  state: Pick<PoStoreState, 'document' | 'filter' | 'searchQuery'>,
) {
  const document = state.document;
  if (!document) return [];

  const query = state.searchQuery ? state.searchQuery.toLowerCase() : '';
  return document.entryOrder.filter((id) => {
    const entry = document.entriesById[id];
    if (!statusMatch(entry, state.filter)) return false;
    if (!query) return true;

    return (
      entry.msgid.toLowerCase().includes(query) ||
      entry.msgstr.toLowerCase().includes(query) ||
      (entry.msgctxt !== null && entry.msgctxt.toLowerCase().includes(query))
    );
  });
}

export function getSelectedVisibleEntries(
  state: Pick<PoStoreState, 'document' | 'filter' | 'searchQuery' | 'selectedIds'>,
) {
  const document = state.document;
  if (!document) return [];

  return getFilteredEntryIds(state).flatMap((id) => {
    if (!state.selectedIds.has(id)) return [];
    return [document.entriesById[id]];
  });
}

export function toPoFile(state: Pick<PoStoreState, 'document'>): PoFile | null {
  if (!state.document) return null;

  return {
    filename: state.document.filename,
    metadata: state.document.metadata,
    entries: getDocumentEntries(state.document),
  };
}
