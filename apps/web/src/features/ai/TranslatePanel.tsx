import { useState, useCallback } from 'react';
import { usePoStore } from '../po/usePoStore';
import { translate } from '@/api/client';
import { ModelSelector } from './ModelSelector';
import { StyleSelector } from './StyleSelector';
import { CustomInstructions } from './CustomInstructions';
import { SuggestionReview } from './SuggestionReview';
import { BatchProgress } from './BatchProgress';
import type { TranslationSuggestion, GlossaryTerm } from '@po-ai-editor/shared';
import { toast } from 'sonner';

const DEFAULT_BATCH_SIZE = 20;

interface TranslatePanelProps {
  glossary: GlossaryTerm[];
}

export function TranslatePanel({ glossary }: TranslatePanelProps) {
  const { state, dispatch, filteredEntries } = usePoStore();
  const [model, setModel] = useState('');
  const [formality, setFormality] = useState('auto');
  const [tone, setTone] = useState('auto');
  const [customInstructions, setCustomInstructions] = useState('');
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE);
  const [suggestions, setSuggestions] = useState<TranslationSuggestion[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [failedBatches, setFailedBatches] = useState(0);

  const selectedEntries = filteredEntries.filter((e) =>
    state.selectedEntryIds.has(e.id)
  );

  const handleTranslate = useCallback(async () => {
    if (selectedEntries.length === 0) {
      toast.error('No entries selected');
      return;
    }

    setIsTranslating(true);
    setSuggestions([]);
    setFailedBatches(0);

    const batches: typeof selectedEntries[] = [];
    for (let i = 0; i < selectedEntries.length; i += batchSize) {
      batches.push(selectedEntries.slice(i, i + batchSize));
    }

    setTotalBatches(batches.length);
    setCurrentBatch(0);

    const allSuggestions: TranslationSuggestion[] = [];

    for (let i = 0; i < batches.length; i++) {
      setCurrentBatch(i + 1);
      try {
        const existingTranslations = state.file?.entries
          .filter((e) => e.isTranslated && !e.isFuzzy)
          .slice(0, 10)
          .map((e) => ({ msgid: e.msgid, msgstr: e.msgstr })) || [];

        const response = await translate({
          model,
          sourceLanguage: state.file?.metadata.language || 'English',
          targetLanguage: 'German',
          style: { formality, tone },
          customInstructions,
          glossary,
          context: {
            mode: 'style-sample',
            existingTranslations,
          },
          entries: batches[i].map((e) => ({
            id: e.id,
            msgctxt: e.msgctxt,
            msgid: e.msgid,
            msgidPlural: e.msgidPlural,
            comments: [
              e.comments.translator,
              e.comments.extracted,
              e.comments.reference,
            ].filter(Boolean) as string[],
            references: e.comments.reference ? [e.comments.reference] : [],
            flags: e.isFuzzy ? ['fuzzy'] : [],
          })),
        });

        allSuggestions.push(...response.suggestions);
      } catch (error) {
        setFailedBatches((prev) => prev + 1);
        toast.error(`Batch ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setSuggestions(allSuggestions);
    setIsTranslating(false);
    toast.success(`Got ${allSuggestions.length} suggestions`);
  }, [selectedEntries, model, formality, tone, customInstructions, glossary, batchSize, state.file]);

  const handleRetryFailed = useCallback(() => {
    handleTranslate();
  }, [handleTranslate]);

  const handleApply = useCallback(() => {
    dispatch({ type: 'APPLY_SUGGESTIONS', payload: suggestions });
    setSuggestions([]);
    toast.success('Applied suggestions');
  }, [dispatch, suggestions]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Target Language</label>
        <input
          type="text"
          value="German"
          disabled
          className="w-full mt-1 border rounded px-3 py-2 text-sm bg-muted"
        />
      </div>
      <ModelSelector value={model} onChange={setModel} />
      <StyleSelector
        formality={formality}
        tone={tone}
        onFormalityChange={setFormality}
        onToneChange={setTone}
      />
      <CustomInstructions value={customInstructions} onChange={setCustomInstructions} />
      <div>
        <label className="text-sm font-medium">Batch Size</label>
        <input
          type="range"
          min={5}
          max={100}
          value={batchSize}
          onChange={(e) => setBatchSize(parseInt(e.target.value))}
          className="w-full mt-1"
        />
        <span className="text-xs text-muted-foreground">{batchSize} entries per batch</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleTranslate}
          disabled={isTranslating || selectedEntries.length === 0}
          className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50"
        >
          {isTranslating ? 'Translating...' : `Translate ${selectedEntries.length} entries`}
        </button>
        <button
          onClick={handleTranslate}
          disabled={isTranslating || !state.file}
          className="border px-4 py-2 rounded hover:bg-muted disabled:opacity-50"
        >
          Translate All
        </button>
      </div>
      {isTranslating && (
        <BatchProgress
          current={currentBatch}
          total={totalBatches}
          failed={failedBatches}
          onRetryFailed={handleRetryFailed}
        />
      )}
      {suggestions.length > 0 && !isTranslating && (
        <SuggestionReview
          suggestions={suggestions}
          entries={selectedEntries}
          onApply={handleApply}
          onDismiss={() => setSuggestions([])}
        />
      )}
    </div>
  );
}
