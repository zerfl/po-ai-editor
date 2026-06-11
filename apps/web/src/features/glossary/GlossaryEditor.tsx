import { useState } from 'react';
import type { GlossaryTerm, Glossary } from '@po-ai-editor/shared';

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
    onChange([...glossary, { source: newSource, target: newTarget, note: newNote || undefined }]);
    setNewSource('');
    setNewTarget('');
    setNewNote('');
  };

  const handleRemove = (index: number) => {
    onChange(glossary.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Glossary</h3>
      <div className="space-y-2">
        {glossary.map((term, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="flex-1 font-mono">{term.source}</span>
            <span className="text-muted-foreground">→</span>
            <span className="flex-1 font-mono">{term.target}</span>
            <button
              onClick={() => handleRemove(i)}
              className="text-destructive hover:underline text-xs"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Source term"
          value={newSource}
          onChange={(e) => setNewSource(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Target translation"
          value={newTarget}
          onChange={(e) => setNewTarget(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Note (optional)"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={!newSource || !newTarget}
          className="w-full border px-3 py-2 rounded text-sm hover:bg-muted disabled:opacity-50"
        >
          Add Term
        </button>
      </div>
    </div>
  );
}
