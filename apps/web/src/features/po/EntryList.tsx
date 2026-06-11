import { useCallback, useRef, useEffect } from 'react';
import { usePoStore } from './usePoStore';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search, CheckSquare, Square } from 'lucide-react';
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

export function EntryList() {
  const { state, dispatch, filteredEntries } = usePoStore();
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setItemRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) {
        itemRefs.current.set(id, el);
      } else {
        itemRefs.current.delete(id);
      }
    },
    []
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

      if (!state.selectedEntryId || filteredEntries.length === 0) return;

      const currentIndex = filteredEntries.findIndex(
        (entry) => entry.id === state.selectedEntryId
      );

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const nextIndex = Math.min(
          currentIndex + 1,
          filteredEntries.length - 1
        );
        const nextEntry = filteredEntries[nextIndex];
        dispatch({ type: 'SELECT_ENTRY', payload: nextEntry.id });
        const el = itemRefs.current.get(nextEntry.id);
        el?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        const prevEntry = filteredEntries[prevIndex];
        dispatch({ type: 'SELECT_ENTRY', payload: prevEntry.id });
        const el = itemRefs.current.get(prevEntry.id);
        el?.scrollIntoView({ block: 'nearest' });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedEntryId, filteredEntries, dispatch]);

  if (!state.file) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <Select
          value={state.filter}
          onValueChange={(value) =>
            dispatch({ type: 'SET_FILTER', payload: value as FilterType })
          }
        >
          <SelectTrigger className="h-7 w-[130px] text-xs">
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
            onChange={(e) =>
              dispatch({ type: 'SET_SEARCH', payload: e.target.value })
            }
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Selection controls */}
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => dispatch({ type: 'SELECT_ALL' })}
            title="Select all"
          >
            <CheckSquare />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => dispatch({ type: 'DESELECT_ALL' })}
            title="Deselect all"
          >
            <Square />
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
      <ScrollArea className="flex-1">
        <div ref={listRef} className="divide-y">
          {filteredEntries.length === 0 ? (
            <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
              No entries match
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                ref={(el) => setItemRef(entry.id, el)}
                className={`flex cursor-pointer items-start gap-2.5 px-3 py-2 transition-colors hover:bg-muted/50 ${
                  state.selectedEntryId === entry.id
                    ? 'bg-muted/60 border-l-2 border-l-primary'
                    : 'border-l-2 border-l-transparent'
                }`}
                onClick={() =>
                  dispatch({ type: 'SELECT_ENTRY', payload: entry.id })
                }
              >
                <Checkbox
                  checked={state.selectedEntryIds.has(entry.id)}
                  onCheckedChange={() =>
                    dispatch({ type: 'TOGGLE_ENTRY', payload: entry.id })
                  }
                  onClick={(e) => e.stopPropagation()}
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-foreground mt-0.5 truncate font-mono text-[13px] leading-snug">
                        {entry.msgid}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="max-w-sm font-mono text-xs"
                    >
                      {entry.msgid}
                    </TooltipContent>
                  </Tooltip>
                  <p className="text-muted-foreground truncate font-mono text-[12px] leading-snug">
                    {entry.msgstr || (
                      <em className="text-muted-foreground/50">
                        No translation
                      </em>
                    )}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
