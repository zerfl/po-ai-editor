import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { PoEntry, TranslationSuggestion } from '@po-ai-editor/shared';
import { AlertTriangle, Check, X } from 'lucide-react';

interface SuggestionReviewProps {
  suggestions: TranslationSuggestion[];
  entries: PoEntry[];
  onApply: () => void;
  onDismiss: () => void;
}

export function SuggestionReview({
  suggestions,
  entries,
  onApply,
  onDismiss,
}: SuggestionReviewProps) {
  const reviewCount = suggestions.filter((s) => s.needsReview).length;

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium">Suggestions ({suggestions.length})</h3>
          {reviewCount > 0 && (
            <Badge
              variant="secondary"
              className="h-4 text-[10px] border-amber-300 bg-amber-50 text-amber-700"
            >
              <AlertTriangle className="mr-0.5 size-2.5" />
              {reviewCount} need review
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="xs" onClick={onApply}>
            <Check />
            Apply All
          </Button>
          <Button variant="ghost" size="xs" onClick={onDismiss}>
            <X />
            Dismiss
          </Button>
        </div>
      </div>
      <div className="overflow-y-auto scrollbar-thin scrollbar-gutter-stable scrollbar-thumb-border scrollbar-track-transparent">
        <div className="divide-y">
          {suggestions.map((suggestion) => {
            const entry = entries.find((e) => e.id === suggestion.id);
            if (!entry) return null;

            return (
              <div key={suggestion.id} className="px-3 py-2">
                <p className="text-foreground text-wrap font-mono text-[11px]">{entry.msgid}</p>
                <div className="mt-1 text-xs">
                  {entry.msgstr && (
                    <span className="text-muted-foreground line-through">{entry.msgstr}</span>
                  )}
                  {entry.msgstr && <span className="text-muted-foreground mx-1.5">→</span>}
                  <span className="text-foreground">{suggestion.msgstr}</span>
                </div>
                {suggestion.notes.length > 0 && (
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    {suggestion.notes.join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
