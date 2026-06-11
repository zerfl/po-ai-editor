import { memo, useCallback, useRef, useEffect, useTransition } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePoStore, statusMatch } from './usePoStore';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, CheckSquare, Square, MinusSquare } from 'lucide-react';
import type { PoEntry } from '@po-ai-editor/shared';

type FilterType = 'all' | 'translated' | 'untranslated' | 'fuzzy' | 'obsolete';

function StatusBadge({ entry }: { entry: PoEntry }) {
  if (entry.isObsolete) {
    return (
      <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
        obsolete
      </Badge>
    );
  }
  if (entry.isFuzzy) {
    return (
      <Badge
        variant="secondary"
        className="h-4 text-[10px] px-1.5 border-amber-300 bg-amber-50 text-amber-700"
      >
        fuzzy
      </Badge>
    );
  }
  if (entry.isTranslated) {
    return (
      <Badge
        variant="secondary"
        className="h-4 text-[10px] px-1.5 border-emerald-300 bg-emerald-50 text-emerald-700"
      >
        translated
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="h-4 text-[10px] px-1.5">
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
  entry: PoEntry;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

const EntryRow = memo(function EntryRow({
  entry,
  isSelected,
  isChecked,
  onSelect,
  onToggle,
}: EntryRowProps) {
  const handleSelect = useCallback(() => {
    onSelect(entry.id);
  }, [entry.id, onSelect]);

  const handleToggle = useCallback(() => {
    onToggle(entry.id);
  }, [entry.id, onToggle]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className={`flex cursor-pointer items-start gap-2.5 px-3 py-2 h-17.5 transition-colors hover:bg-muted/50 ${
        isSelected ? 'bg-muted/60 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
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
  const { state, dispatch, filteredEntries } = usePoStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const filteredEntriesRef = useRef(filteredEntries);
  useEffect(() => {
    filteredEntriesRef.current = filteredEntries;
  }, [filteredEntries]);
  const [, startTransition] = useTransition();
  const getItemKey = useCallback((index: number) => filteredEntries[index].id, [filteredEntries]);

  const virtualizer = useVirtualizer({
    count: filteredEntries.length,
    getScrollElement: () => parentRef.current,
    getItemKey,
    estimateSize: () => 71,
    overscan: 5,
  });

  const allFilteredSelected =
    filteredEntries.length > 0 && filteredEntries.every((e) => state.selectedEntryIds.has(e.id));

  const allOfStatusSelected = (status: FilterType) => {
    if (!state.file) return false;
    const matching = state.file.entries.filter((e) => statusMatch(e, status));
    return matching.length > 0 && matching.every((e) => state.selectedEntryIds.has(e.id));
  };

  const onSelect = useCallback(
    (id: string) => {
      dispatch({ type: 'SELECT_ENTRY', payload: id });
    },
    [dispatch],
  );

  const onToggle = useCallback(
    (id: string) => {
      dispatch({ type: 'TOGGLE_ENTRY', payload: id });
    },
    [dispatch],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const entries = filteredEntriesRef.current;
      if (!state.selectedEntryId || entries.length === 0) return;

      const currentIndex = entries.findIndex((entry) => entry.id === state.selectedEntryId);

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, entries.length - 1);
        dispatch({ type: 'SELECT_ENTRY', payload: entries[nextIndex].id });
        virtualizer.scrollToIndex(nextIndex, { align: 'auto' });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        dispatch({ type: 'SELECT_ENTRY', payload: entries[prevIndex].id });
        virtualizer.scrollToIndex(prevIndex, { align: 'auto' });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.selectedEntryId, dispatch, virtualizer]);

  if (!state.file) return null;

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <Select
          value={state.filter}
          onValueChange={(value) => {
            dispatch({ type: 'SET_FILTER', payload: value as FilterType });
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
            value={state.searchQuery}
            onChange={(e) => {
              const value = e.target.value;
              startTransition(() => {
                dispatch({ type: 'SET_SEARCH', payload: value });
              });
            }}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Selection controls */}
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              dispatch(allFilteredSelected ? { type: 'DESELECT_ALL' } : { type: 'SELECT_ALL' });
            }}
            title={allFilteredSelected ? 'Deselect all' : 'Select all'}
          >
            {allFilteredSelected ? <MinusSquare /> : <CheckSquare />}
            <span>{allFilteredSelected ? 'Deselect' : 'Select all'}</span>
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              dispatch({ type: 'SELECT_BY_STATUS', payload: 'untranslated' });
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
              dispatch({ type: 'SELECT_BY_STATUS', payload: 'fuzzy' });
            }}
            title="Select fuzzy"
          >
            {allOfStatusSelected('fuzzy') ? <CheckSquare /> : <Square />}
            <span>Fuzzy</span>
          </Button>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
          <span>{filteredEntries.length} entries</span>
          {state.selectedEntryIds.size > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="text-foreground font-medium">
                {state.selectedEntryIds.size} selected
              </span>
            </>
          )}
        </div>
      </div>

      {/* Entry list */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-gutter-stable scrollbar-thumb-border scrollbar-track-transparent"
      >
        <div className="relative w-full divide-y" style={{ height: virtualizer.getTotalSize() }}>
          {filteredEntries.length === 0
            ? NO_ENTRIES_MESSAGE
            : virtualItems.map((virtualRow) => {
                const entry = filteredEntries[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    className="absolute left-0 top-0 w-full"
                    style={{ transform: 'translateY(' + String(virtualRow.start) + 'px)' }}
                  >
                    <EntryRow
                      entry={entry}
                      isSelected={state.selectedEntryId === entry.id}
                      isChecked={state.selectedEntryIds.has(entry.id)}
                      onSelect={onSelect}
                      onToggle={onToggle}
                    />
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}
