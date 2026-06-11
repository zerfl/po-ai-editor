import { useState, useCallback } from 'react';
import { usePoStore } from '../po/usePoStore';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Languages, Sparkles, RotateCcw } from 'lucide-react';
import type { TranslationSuggestion, GlossaryTerm, Formality, Tone } from '@po-ai-editor/shared';
import { toast } from 'sonner';

const DEFAULT_BATCH_SIZE = 20;

interface TranslatePanelProps {
  glossary: GlossaryTerm[];
}

export function TranslatePanel({ glossary }: TranslatePanelProps) {
  const { state, dispatch, filteredEntries } = usePoStore();
  const [model, setModel] = useState('');
  const [formality, setFormality] = useState<Formality>('auto');
  const [tone, setTone] = useState<Tone>('auto');
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
        const existingTranslations =
          state.file?.entries
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
        toast.error(
          `Batch ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    setSuggestions(allSuggestions);
    setIsTranslating(false);
    toast.success(`Got ${allSuggestions.length} suggestions`);
  }, [
    selectedEntries,
    model,
    formality,
    tone,
    customInstructions,
    glossary,
    batchSize,
    state.file,
  ]);

  const handleRetryFailed = useCallback(() => {
    handleTranslate();
  }, [handleTranslate]);

  const handleApply = useCallback(() => {
    dispatch({
      type: 'APPLY_SUGGESTIONS',
      payload: suggestions.map((s) => ({
        id: s.id,
        msgstr: s.msgstr,
        plural: s.plural ?? undefined,
      })),
    });
    setSuggestions([]);
    toast.success('Applied suggestions');
  }, [dispatch, suggestions]);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3">
        {/* Target language */}
        <div>
          <Label className="text-[11px]">Target Language</Label>
          <Input
            value="German"
            disabled
            className="mt-1 h-8 text-xs bg-muted"
          />
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
        <CustomInstructions
          value={customInstructions}
          onChange={setCustomInstructions}
        />

        <Separator />

        {/* Batch size */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-[11px]">Batch Size</Label>
            <span className="text-muted-foreground text-[11px]">
              {batchSize} entries
            </span>
          </div>
          <Slider
            value={[batchSize]}
            onValueChange={([value]) => setBatchSize(value)}
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
            onClick={handleTranslate}
            disabled={isTranslating || selectedEntries.length === 0}
            className="flex-1 h-8 text-xs"
            size="sm"
          >
            <Languages />
            {isTranslating
              ? 'Translating...'
              : `Translate ${selectedEntries.length}`}
          </Button>
          <Button
            onClick={handleTranslate}
            disabled={isTranslating || !state.file}
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
            onRetryFailed={handleRetryFailed}
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
              onClick={handleRetryFailed}
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
            entries={selectedEntries}
            onApply={handleApply}
            onDismiss={() => setSuggestions([])}
          />
        )}
      </div>
    </ScrollArea>
  );
}
