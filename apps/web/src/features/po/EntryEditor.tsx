import { usePoStore } from './usePoStore';
import { useState, useEffect } from 'react';

export function EntryEditor() {
  const { state, dispatch } = usePoStore();
  const [msgstr, setMsgstr] = useState('');
  const [pluralMsgstrs, setPluralMsgstrs] = useState<string[]>([]);

  const entry = state.file?.entries.find((e) => e.id === state.selectedEntryId);

  useEffect(() => {
    if (entry) {
      setMsgstr(entry.msgstr);
      setPluralMsgstrs(entry.msgstrPlural.length > 0 ? [...entry.msgstrPlural] : ['']);
    }
  }, [entry?.id]);

  if (!entry) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        Select an entry to edit
      </div>
    );
  }

  const handleSave = () => {
    if (entry.msgidPlural) {
      pluralMsgstrs.forEach((str, i) => {
        dispatch({ type: 'UPDATE_ENTRY_PLURAL', payload: { id: entry.id, index: i, msgstr: str } });
      });
    } else {
      dispatch({ type: 'UPDATE_ENTRY', payload: { id: entry.id, msgstr } });
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2">
        <h3 className="text-sm font-medium">Edit Entry</h3>
      </div>
      <div className="p-4 space-y-4">
        {entry.msgctxt && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Context</label>
            <p className="text-sm font-mono bg-muted p-2 rounded">{entry.msgctxt}</p>
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Source</label>
          <p className="text-sm font-mono bg-muted p-2 rounded whitespace-pre-wrap">{entry.msgid}</p>
        </div>
        {entry.msgidPlural && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Source (plural)</label>
            <p className="text-sm font-mono bg-muted p-2 rounded whitespace-pre-wrap">{entry.msgidPlural}</p>
          </div>
        )}
        {entry.comments.translator && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Translator comment</label>
            <p className="text-sm bg-muted p-2 rounded">{entry.comments.translator}</p>
          </div>
        )}
        {entry.comments.extracted && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Extracted comment</label>
            <p className="text-sm bg-muted p-2 rounded">{entry.comments.extracted}</p>
          </div>
        )}
        {entry.comments.reference && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Reference</label>
            <p className="text-sm font-mono bg-muted p-2 rounded">{entry.comments.reference}</p>
          </div>
        )}
        {entry.msgidPlural ? (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Translations (plural)</label>
            {pluralMsgstrs.map((str, i) => (
              <textarea
                key={i}
                value={str}
                onChange={(e) => {
                  const newPlural = [...pluralMsgstrs];
                  newPlural[i] = e.target.value;
                  setPluralMsgstrs(newPlural);
                }}
                onBlur={handleSave}
                className="w-full mt-1 text-sm font-mono border rounded p-2 min-h-[60px]"
                placeholder={`Plural form ${i}`}
              />
            ))}
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Translation</label>
            <textarea
              value={msgstr}
              onChange={(e) => setMsgstr(e.target.value)}
              onBlur={handleSave}
              className="w-full mt-1 text-sm font-mono border rounded p-2 min-h-[100px]"
              placeholder="Enter translation..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
