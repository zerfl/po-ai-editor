import { usePoStore } from './usePoStore';

export function EntryList() {
  const { state, dispatch, filteredEntries } = usePoStore();

  if (!state.file) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {filteredEntries.length} entries
          </span>
          <select
            value={state.filter}
            onChange={(e) => dispatch({ type: 'SET_FILTER', payload: e.target.value as any })}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="translated">Translated</option>
            <option value="untranslated">Untranslated</option>
            <option value="fuzzy">Fuzzy</option>
            <option value="obsolete">Obsolete</option>
          </select>
          <input
            type="text"
            placeholder="Search..."
            value={state.searchQuery}
            onChange={(e) => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
            className="text-sm border rounded px-2 py-1 w-48"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: 'SELECT_ALL' })}
            className="text-sm text-primary hover:underline"
          >
            Select all
          </button>
          <button
            onClick={() => dispatch({ type: 'DESELECT_ALL' })}
            className="text-sm text-muted-foreground hover:underline"
          >
            Deselect
          </button>
          <span className="text-sm text-muted-foreground">
            {state.selectedEntryIds.size} selected
          </span>
        </div>
      </div>
      <div className="divide-y max-h-[60vh] overflow-y-auto">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className={`px-4 py-3 flex items-start gap-3 hover:bg-muted/50 cursor-pointer ${
              state.selectedEntryId === entry.id ? 'bg-muted/50' : ''
            }`}
            onClick={() => dispatch({ type: 'SELECT_ENTRY', payload: entry.id })}
          >
            <input
              type="checkbox"
              checked={state.selectedEntryIds.has(entry.id)}
              onChange={() => dispatch({ type: 'TOGGLE_ENTRY', payload: entry.id })}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {entry.isFuzzy && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                    fuzzy
                  </span>
                )}
                {entry.isObsolete && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    obsolete
                  </span>
                )}
                {!entry.isTranslated && !entry.isObsolete && (
                  <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                    untranslated
                  </span>
                )}
                {entry.isTranslated && !entry.isFuzzy && (
                  <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                    translated
                  </span>
                )}
              </div>
              <p className="text-sm font-mono mt-1 truncate">{entry.msgid}</p>
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {entry.msgstr || <em className="text-muted-foreground/50">No translation</em>}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
