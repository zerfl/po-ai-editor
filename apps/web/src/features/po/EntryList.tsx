import { memo, useCallback, useEffect, useMemo, useRef, useTransition } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  getEntryById,
  getFilteredEntryIds,
  selectDeselectAll,
  selectDocument,
  selectFilter,
  selectSearchQuery,
  selectSelectedIds,
  selectSelectAllVisible,
  selectSelectByStatus,
  selectSelectEntry,
  selectSetFilter,
  selectSetSearchQuery,
  selectToggleEntry,
  statusMatch,
  usePoStore,
  usePoStoreApi,
  type PoFilter,
} from './store';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, CheckSquare, Square, MinusSquare } from 'lucide-react';
import type { PoEntry } from '@po-ai-editor/shared';

function StatusBadge({ entry }: { entry: PoEntry }) {
  if (entry.isObsolete) {
    return (
      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
        obsolete
      </Badge>
    );
  }
  if (entry.isFuzzy) {
    return (
      <Badge
        variant="secondary"
        className="h-4 border-amber-300 bg-amber-50 px-1.5 text-[10px] text-amber-700"
      >
        fuzzy
      </Badge>
    );
  }
  if (entry.isTranslated) {
    return (
      <Badge
        variant="secondary"
        className="h-4 border-emerald-300 bg-emerald-50 px-1.5 text-[10px] text-emerald-700"
      >
        translated
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
      untranslated
    </Badge>
  );
}

const NO_ENTRIES_MESSAGE = (
  <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
    No entries match
  </div>
);

interface EntryRowProps {
  entryId: string;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

const EntryRow = memo(function EntryRow({ entryId, onSelect, onToggle }: EntryRowProps) {
  const entry = usePoStore((state) => getEntryById(state, entryId));
  const isSelected = usePoStore((state) => state.selectedEntryId === entryId);
  const isChecked = usePoStore((state) => state.selectedIds.has(entryId));

  const handleSelect = useCallback(() => {
    onSelect(entryId);
  }, [entryId, onSelect]);

  const handleToggle = useCallback(() => {
    onToggle(entryId);
  }, [entryId, onToggle]);

  const handleCheckboxClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);

  if (!entry) return null;

  return (
    <div
      className={`flex h-17.5 cursor-pointer items-start gap-2.5 px-3 py-2 transition-colors hover:bg-muted/50 ${
        isSelected ? 'border-l-2 border-l-primary bg-muted/60' : 'border-l-2 border-l-transparent'
      }`}
      onClick={handleSelect}
    >
      <Checkbox
        checked={isChecked}
        onCheckedChange={handleToggle}
        onClick={handleCheckboxClick}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <StatusBadge entry={entry} />
          {entry.msgctxt && (
            <span className="text-muted-foreground font-mono text-[10px]">
              ctx: {entry.msgctxt}
            </span>
          )}
        </div>
        <p
          title={entry.msgid}
          className="text-foreground mt-0.5 truncate font-mono text-[13px] leading-snug"
        >
          {entry.msgid}
        </p>
        <p className="text-muted-foreground truncate font-mono text-[12px] leading-snug">
          {entry.msgstr || <em className="text-muted-foreground/50">No translation</em>}
        </p>
      </div>
    </div>
  );
});

export function EntryList() {
  const poDocument = usePoStore(selectDocument);
  const filter = usePoStore(selectFilter);
  const searchQuery = usePoStore(selectSearchQuery);
  const selectedIds = usePoStore(selectSelectedIds);
  const setFilter = usePoStore(selectSetFilter);
  const setSearchQuery = usePoStore(selectSetSearchQuery);
  const selectEntry = usePoStore(selectSelectEntry);
  const toggleEntry = usePoStore(selectToggleEntry);
  const selectAllVisible = usePoStore(selectSelectAllVisible);
  const deselectAll = usePoStore(selectDeselectAll);
  const selectByStatus = usePoStore(selectSelectByStatus);
  const store = usePoStoreApi();
  const parentRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const filteredEntryIds = useMemo(
    () =>
      getFilteredEntryIds({
        document: poDocument,
        filter,
        searchQuery,
      }),
    [poDocument, filter, searchQuery],
  );

  const filteredEntryIdsRef = useRef(filteredEntryIds);
  useEffect(() => {
    filteredEntryIdsRef.current = filteredEntryIds;
  }, [filteredEntryIds]);

  const getItemKey = useCallback((index: number) => filteredEntryIds[index], [filteredEntryIds]);

  const virtualizer = useVirtualizer({
    count: filteredEntryIds.length,
    getScrollElement: () => parentRef.current,
    getItemKey,
    estimateSize: () => 71,
    overscan: 5,
  });

  const allFilteredSelected =
    filteredEntryIds.length > 0 && filteredEntryIds.every((id) => selectedIds.has(id));

  const allOfStatusSelected = useCallback(
    (status: PoFilter) => {
      const document = poDocument;
      if (!document) return false;

      const matchingIds = document.entryOrder.filter((id) =>
        statusMatch(document.entriesById[id], status),
      );
      return matchingIds.length > 0 && matchingIds.every((id) => selectedIds.has(id));
    },
    [poDocument, selectedIds],
  );

  const onSelect = useCallback(
    (id: string) => {
      selectEntry(id);
    },
    [selectEntry],
  );

  const onToggle = useCallback(
    (id: string) => {
      toggleEntry(id);
    },
    [toggleEntry],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const currentSelectedId = store.getState().selectedEntryId;
      const ids = filteredEntryIdsRef.current;
      if (!currentSelectedId || ids.length === 0) return;

      const currentIndex = ids.findIndex((id) => id === currentSelectedId);
      if (currentIndex < 0) return;

      if (event.key === 'ArrowDown' || event.key === 'j') {
        event.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, ids.length - 1);
        selectEntry(ids[nextIndex]);
        virtualizer.scrollToIndex(nextIndex, { align: 'auto' });
      } else if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        selectEntry(ids[prevIndex]);
        virtualizer.scrollToIndex(prevIndex, { align: 'auto' });
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectEntry, store, virtualizer]);

  if (!poDocument) return null;

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <Select
          value={filter}
          onValueChange={(value) => {
            setFilter(value as PoFilter);
          }}
        >
          <SelectTrigger className="h-7 w-32.5 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entries</SelectItem>
            <SelectItem value="translated">Translated</SelectItem>
            <SelectItem value="untranslated">Untranslated</SelectItem>
            <SelectItem value="fuzzy">Fuzzy</SelectItem>
            <SelectItem value="obsolete">Obsolete</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-2 top-1/2 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => {
                setSearchQuery(value);
              });
            }}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={allFilteredSelected ? deselectAll : selectAllVisible}
            title={allFilteredSelected ? 'Deselect all' : 'Select all'}
          >
            {allFilteredSelected ? <MinusSquare /> : <CheckSquare />}
            <span>{allFilteredSelected ? 'Deselect' : 'Select all'}</span>
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              selectByStatus('untranslated');
            }}
            title="Select untranslated"
          >
            {allOfStatusSelected('untranslated') ? <CheckSquare /> : <Square />}
            <span>Untranslated</span>
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              selectByStatus('fuzzy');
            }}
            title="Select fuzzy"
          >
            {allOfStatusSelected('fuzzy') ? <CheckSquare /> : <Square />}
            <span>Fuzzy</span>
          </Button>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
          <span>{filteredEntryIds.length} entries</span>
          {selectedIds.size > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="text-foreground font-medium">{selectedIds.size} selected</span>
            </>
          )}
        </div>
      </div>

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-gutter-stable scrollbar-thumb-border scrollbar-track-transparent"
      >
        <div className="relative w-full divide-y" style={{ height: virtualizer.getTotalSize() }}>
          {filteredEntryIds.length === 0
            ? NO_ENTRIES_MESSAGE
            : virtualItems.map((virtualRow) => (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${String(virtualRow.start)}px)` }}
                >
                  <EntryRow
                    entryId={filteredEntryIds[virtualRow.index]}
                    onSelect={onSelect}
                    onToggle={onToggle}
                  />
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
