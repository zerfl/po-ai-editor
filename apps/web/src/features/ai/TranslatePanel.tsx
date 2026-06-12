import { useState, useCallback } from 'react';
import {
  getSelectedVisibleEntries,
  selectApplySuggestions,
  selectHasFile,
  selectVisibleSelectedCount,
  usePoStore,
  usePoStoreApi,
  toPoFile,
} from '../po/store';
import { translate } from '@/api/client';
import { ModelSelector } from './ModelSelector';
import { StyleSelector } from './StyleSelector';
import { CustomInstructions } from './CustomInstructions';
import { SuggestionReview } from './SuggestionReview';
import { BatchProgress } from './BatchProgress';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

import { Slider } from '@/components/ui/slider';
import { Languages, Sparkles, RotateCcw } from 'lucide-react';
import type {
  TranslationSuggestion,
  GlossaryTerm,
  Formality,
  Tone,
  PoEntry,
} from '@po-ai-editor/shared';
import { toast } from 'sonner';

const DEFAULT_BATCH_SIZE = 20;

interface TranslatePanelProps {
  glossary: GlossaryTerm[];
}

export function TranslatePanel({ glossary }: TranslatePanelProps) {
  const hasFile = usePoStore(selectHasFile);
  const selectedVisibleCount = usePoStore(selectVisibleSelectedCount);
  const applySuggestions = usePoStore(selectApplySuggestions);
  const store = usePoStoreApi();
  const [model, setModel] = useState('');
  const [formality, setFormality] = useState<Formality>('auto');
  const [tone, setTone] = useState<Tone>('auto');
  const [customInstructions, setCustomInstructions] = useState('');
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE);
  const [suggestions, setSuggestions] = useState<TranslationSuggestion[]>([]);
  const [reviewEntries, setReviewEntries] = useState<PoEntry[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [failedBatches, setFailedBatches] = useState(0);

  const handleTranslate = useCallback(async () => {
    const snapshot = store.getState();
    const file = toPoFile(snapshot);
    const entries = getSelectedVisibleEntries(snapshot);

    if (entries.length === 0) {
      toast.error('No entries selected');
      return;
    }
    if (!file) {
      toast.error('No file loaded');
      return;
    }

    setIsTranslating(true);
    setSuggestions([]);
    setReviewEntries(entries);
    setFailedBatches(0);

    const batches: (typeof entries)[] = [];
    for (let i = 0; i < entries.length; i += batchSize) {
      batches.push(entries.slice(i, i + batchSize));
    }

    setTotalBatches(batches.length);
    setCurrentBatch(0);

    const allSuggestions: TranslationSuggestion[] = [];
    const existingTranslations = file.entries
      .filter((entry) => entry.isTranslated && !entry.isFuzzy)
      .slice(0, 10)
      .map((entry) => ({ msgid: entry.msgid, msgstr: entry.msgstr }));

    for (let i = 0; i < batches.length; i++) {
      setCurrentBatch(i + 1);
      try {
        const response = await translate({
          model,
          sourceLanguage: file.metadata.language || 'English',
          targetLanguage: 'German',
          style: { formality, tone },
          customInstructions,
          glossary,
          context: {
            mode: 'style-sample',
            existingTranslations,
          },
          entries: batches[i].map((e) => {
            const comments: string[] = [];
            if (e.comments.translator) comments.push(e.comments.translator);
            if (e.comments.extracted) comments.push(e.comments.extracted);
            if (e.comments.reference) comments.push(e.comments.reference);
            return {
              id: e.id,
              msgctxt: e.msgctxt,
              msgid: e.msgid,
              msgidPlural: e.msgidPlural,
              comments,
              references: e.comments.reference ? [e.comments.reference] : [],
              flags: e.isFuzzy ? ['fuzzy'] : [],
            };
          }),
        });

        allSuggestions.push(...response.suggestions);
      } catch (error) {
        setFailedBatches((prev) => prev + 1);
        toast.error(
          `Batch ${String(i + 1)} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    setSuggestions(allSuggestions);
    setIsTranslating(false);
    toast.success(`Got ${String(allSuggestions.length)} suggestions`);
  }, [batchSize, customInstructions, formality, glossary, model, store, tone]);

  const handleApply = useCallback(() => {
    applySuggestions(
      suggestions.map((s) => ({
        id: s.id,
        msgstr: s.msgstr,
        plural: s.plural ?? undefined,
      })),
    );
    setSuggestions([]);
    setReviewEntries([]);
    toast.success('Applied suggestions');
  }, [applySuggestions, suggestions]);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-gutter-stable scrollbar-thumb-border scrollbar-track-transparent">
      <div className="space-y-4 p-3">
        {/* Target language */}
        <div>
          <Label className="text-[11px]">Target Language</Label>
          <Input value="German" disabled className="mt-1 h-8 text-xs bg-muted" />
        </div>

        {/* Model */}
        <ModelSelector value={model} onChange={setModel} />

        <Separator />

        {/* Style */}
        <StyleSelector
          formality={formality}
          tone={tone}
          onFormalityChange={setFormality}
          onToneChange={setTone}
        />

        <Separator />

        {/* Custom instructions */}
        <CustomInstructions value={customInstructions} onChange={setCustomInstructions} />

        <Separator />

        {/* Batch size */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-[11px]">Batch Size</Label>
            <span className="text-muted-foreground text-[11px]">{batchSize} entries</span>
          </div>
          <Slider
            value={[batchSize]}
            onValueChange={([value]) => {
              setBatchSize(value);
            }}
            min={5}
            max={100}
            step={5}
            className="mt-2"
          />
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => void handleTranslate()}
            disabled={isTranslating || selectedVisibleCount === 0}
            className="flex-1 h-8 text-xs"
            size="sm"
          >
            <Languages />
            {isTranslating ? 'Translating...' : `Translate ${String(selectedVisibleCount)}`}
          </Button>
          <Button
            onClick={() => void handleTranslate()}
            disabled={isTranslating || !hasFile}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
          >
            <Sparkles />
            All
          </Button>
        </div>

        {/* Progress */}
        {isTranslating && (
          <BatchProgress
            current={currentBatch}
            total={totalBatches}
            failed={failedBatches}
            onRetryFailed={() => void handleTranslate()}
          />
        )}

        {/* Failed batches retry */}
        {failedBatches > 0 && !isTranslating && (
          <div className="flex items-center justify-between rounded border border-destructive/20 bg-destructive/5 px-3 py-2">
            <span className="text-destructive text-xs">
              {failedBatches} batch{failedBatches > 1 ? 'es' : ''} failed
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => void handleTranslate()}
              className="text-destructive"
            >
              <RotateCcw />
              Retry
            </Button>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && !isTranslating && (
          <SuggestionReview
            suggestions={suggestions}
            entries={reviewEntries}
            onApply={handleApply}
            onDismiss={() => {
              setSuggestions([]);
              setReviewEntries([]);
            }}
          />
        )}
      </div>
    </div>
  );
}
