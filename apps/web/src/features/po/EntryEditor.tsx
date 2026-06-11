import { usePoStore } from './usePoStore';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, FileCode, BookOpen, Keyboard, Check } from 'lucide-react';

export function EntryEditor() {
  const { state, dispatch } = usePoStore();
  const [msgstr, setMsgstr] = useState('');
  const [pluralMsgstrs, setPluralMsgstrs] = useState<string[]>([]);
  const [saved, setSaved] = useState(true);

  const entry = state.file?.entries.find((e) => e.id === state.selectedEntryId);

  useEffect(() => {
    if (entry) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local form state with selected entry
      setMsgstr(entry.msgstr);
      setPluralMsgstrs(entry.msgstrPlural.length > 0 ? [...entry.msgstrPlural] : ['']);
      setSaved(true);
    }
  }, [entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- only reset on entry ID change

  if (!entry) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Keyboard className="size-5" />
        <p className="text-sm">Select an entry to edit</p>
        <p className="text-[11px]">Use ↑↓ or j/k to navigate</p>
      </div>
    );
  }

  const handleSave = () => {
    if (entry.msgidPlural) {
      pluralMsgstrs.forEach((str, i) => {
        dispatch({
          type: 'UPDATE_ENTRY_PLURAL',
          payload: { id: entry.id, index: i, msgstr: str },
        });
      });
    } else {
      dispatch({
        type: 'UPDATE_ENTRY',
        payload: { id: entry.id, msgstr },
      });
    }
    setSaved(true);
  };

  const handleMsgstrChange = (value: string) => {
    setMsgstr(value);
    setSaved(false);
  };

  const handlePluralChange = (index: number, value: string) => {
    const newPlural = [...pluralMsgstrs];
    newPlural[index] = value;
    setPluralMsgstrs(newPlural);
    setSaved(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3" onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Edit Entry</h3>
            <div className="flex items-center gap-1">
              {entry.isFuzzy && (
                <Badge
                  variant="secondary"
                  className="h-4 text-[10px] border-amber-300 bg-amber-50 text-amber-700"
                >
                  fuzzy
                </Badge>
              )}
              {entry.isObsolete && (
                <Badge variant="secondary" className="h-4 text-[10px]">
                  obsolete
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved ? (
              <span className="flex items-center gap-1 text-emerald-600 text-[11px]">
                <Check className="size-3" />
                Saved
              </span>
            ) : (
              <span className="text-muted-foreground text-[11px]">Unsaved</span>
            )}
          </div>
        </div>

        <Separator className="my-3" />

        {/* Context */}
        {entry.msgctxt && (
          <div className="mb-3">
            <Label className="text-muted-foreground text-[11px] flex items-center gap-1.5">
              <MessageSquare className="size-3" />
              Context
            </Label>
            <div className="bg-muted mt-1 rounded p-2 font-mono text-xs">{entry.msgctxt}</div>
          </div>
        )}

        {/* Source */}
        <div className="mb-3">
          <Label className="text-muted-foreground text-[11px] flex items-center gap-1.5">
            <FileCode className="size-3" />
            Source
          </Label>
          <div className="bg-muted mt-1 rounded p-2 font-mono text-xs whitespace-pre-wrap break-all">
            {entry.msgid}
          </div>
        </div>

        {/* Source plural */}
        {entry.msgidPlural && (
          <div className="mb-3">
            <Label className="text-muted-foreground text-[11px]">Source (plural)</Label>
            <div className="bg-muted mt-1 rounded p-2 font-mono text-xs whitespace-pre-wrap break-all">
              {entry.msgidPlural}
            </div>
          </div>
        )}

        {/* Comments */}
        {(entry.comments.translator || entry.comments.extracted || entry.comments.reference) && (
          <>
            <Separator className="my-3" />
            <div className="mb-3 space-y-2">
              <Label className="text-muted-foreground text-[11px] flex items-center gap-1.5">
                <BookOpen className="size-3" />
                Comments
              </Label>
              {entry.comments.translator && (
                <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
                  <span className="font-medium">Translator:</span> {entry.comments.translator}
                </div>
              )}
              {entry.comments.extracted && (
                <div className="rounded border p-2 text-xs text-muted-foreground">
                  {entry.comments.extracted}
                </div>
              )}
              {entry.comments.reference && (
                <div className="font-mono text-[11px] text-muted-foreground">
                  {entry.comments.reference}
                </div>
              )}
            </div>
          </>
        )}

        <Separator className="my-3" />

        {/* Translation */}
        {entry.msgidPlural ? (
          <div className="space-y-2">
            <Label className="text-[11px]">Translations (plural)</Label>
            {pluralMsgstrs.map((str, i) => (
              <div key={i}>
                <Label className="text-muted-foreground text-[11px]">Plural form {i}</Label>
                <Textarea
                  value={str}
                  onChange={(e) => {
                    handlePluralChange(i, e.target.value);
                  }}
                  onBlur={handleSave}
                  className="mt-1 font-mono text-xs min-h-[60px] resize-y"
                  placeholder={`Plural form ${String(i)}`}
                />
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-[11px]">Translation</Label>
              <span className="text-muted-foreground text-[10px]">⌘+Enter to save</span>
            </div>
            <Textarea
              value={msgstr}
              onChange={(e) => {
                handleMsgstrChange(e.target.value);
              }}
              onBlur={handleSave}
              className="mt-1 font-mono text-xs min-h-[120px] resize-y"
              placeholder="Enter translation..."
            />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
