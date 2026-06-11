import type { TranslationSuggestion } from '@po-ai-editor/shared';
import type { PoEntry } from '@po-ai-editor/shared';

interface SuggestionReviewProps {
  suggestions: TranslationSuggestion[];
  entries: PoEntry[];
  onApply: () => void;
  onDismiss: () => void;
}

export function SuggestionReview({ suggestions, entries, onApply, onDismiss }: SuggestionReviewProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">
          AI Suggestions ({suggestions.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onApply}
            className="text-sm bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90"
          >
            Apply All
          </button>
          <button
            onClick={onDismiss}
            className="text-sm border px-3 py-1 rounded hover:bg-muted"
          >
            Dismiss
          </button>
        </div>
      </div>
      <div className="divide-y max-h-[40vh] overflow-y-auto">
        {suggestions.map((suggestion) => {
          const entry = entries.find((e) => e.id === suggestion.id);
          if (!entry) return null;

          return (
            <div key={suggestion.id} className="px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-mono">{entry.msgid}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {entry.msgstr && (
                      <span className="line-through mr-2">{entry.msgstr}</span>
                    )}
                    <span className="text-foreground">{suggestion.msgstr}</span>
                  </p>
                </div>
                {suggestion.needsReview && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                    needs review
                  </span>
                )}
              </div>
              {suggestion.notes.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {suggestion.notes.join(', ')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
