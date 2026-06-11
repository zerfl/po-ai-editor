import { useState } from 'react';
import type { Glossary } from '@po-ai-editor/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, X, BookOpen } from 'lucide-react';

interface GlossaryEditorProps {
  glossary: Glossary;
  onChange: (glossary: Glossary) => void;
}

export function GlossaryEditor({ glossary, onChange }: GlossaryEditorProps) {
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newNote, setNewNote] = useState('');

  const handleAdd = () => {
    if (!newSource || !newTarget) return;
    onChange([
      ...glossary,
      {
        source: newSource,
        target: newTarget,
        note: newNote || undefined,
      },
    ]);
    setNewSource('');
    setNewTarget('');
    setNewNote('');
  };

  const handleRemove = (index: number) => {
    onChange(glossary.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3">
        {/* Existing terms */}
        {glossary.length > 0 && (
          <div>
            <Label className="text-[11px] flex items-center gap-1.5">
              <BookOpen className="size-3" />
              Terms ({glossary.length})
            </Label>
            <div className="mt-2 divide-y rounded border">
              {glossary.map((term, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2.5 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">
                    {term.source}
                  </span>
                  <span className="text-muted-foreground text-xs">→</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">
                    {term.target}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleRemove(i)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {glossary.length > 0 && <Separator />}

        {/* Add new term */}
        <div className="space-y-2" onKeyDown={handleKeyDown}>
          <Label className="text-[11px]">Add Term</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Source"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              className="h-7 text-xs"
            />
            <Input
              placeholder="Target"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <Input
            placeholder="Note (optional)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="h-7 text-xs"
          />
          <Button
            onClick={handleAdd}
            disabled={!newSource || !newTarget}
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
          >
            <Plus />
            Add Term
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
