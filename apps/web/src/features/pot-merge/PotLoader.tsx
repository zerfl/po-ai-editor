import { useCallback, useRef, useState, useEffect } from 'react';
import { type PoDocument, usePoStoreApi } from '../po/store';
import { parseFile } from '@/api/client';
import { getPoEntryKey, type PoEntry, type PoFile } from '@po-ai-editor/shared';
import { toast } from 'sonner';
import { Upload, GitMerge, Loader2 } from 'lucide-react';

function isHeaderEntry(msgctxt: string | null, msgid: string): boolean {
  return msgctxt === null && msgid === '';
}

function isActiveCatalogEntry(entry: PoEntry): boolean {
  return !entry.isObsolete && !isHeaderEntry(entry.msgctxt, entry.msgid);
}

export function summarizePotMergeChanges(
  currentDocument: PoDocument,
  incomingFile: PoFile,
): { added: number; removed: number } {
  const existingEntries = currentDocument.entryOrder
    .map((id) => currentDocument.entriesById[id])
    .filter(isActiveCatalogEntry);
  const potEntries = incomingFile.entries.filter(
    (entry) => !isHeaderEntry(entry.msgctxt, entry.msgid),
  );
  const existingKeys = new Set(existingEntries.map((entry) => getPoEntryKey(entry)));
  const potKeys = new Set(potEntries.map((entry) => getPoEntryKey(entry)));

  return {
    added: potEntries.filter((entry) => !existingKeys.has(getPoEntryKey(entry))).length,
    removed: existingEntries.filter((entry) => !potKeys.has(getPoEntryKey(entry))).length,
  };
}

export function PotLoader() {
  const store = usePoStoreApi();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileRef = useRef(store.getState().document);

  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      fileRef.current = state.document;
    });

    return unsubscribe;
  }, [store]);

  const handleFile = useCallback(
    async (file: File) => {
      const currentDocument = fileRef.current;
      if (!currentDocument) return;

      setIsLoading(true);
      try {
        const content = await file.text();
        const result = await parseFile(content, file.name);
        const { added, removed } = summarizePotMergeChanges(currentDocument, result);

        const parts: string[] = [];
        if (added > 0) parts.push(`${String(added)} new`);
        if (removed > 0) parts.push(`${String(removed)} removed`);

        store.getState().mergeEntries(result);

        const summary = parts.length > 0 ? parts.join(', ') : 'no changes';
        toast.success(`Updated from ${file.name}: ${summary}`);
      } catch (error) {
        toast.error(
          `Failed to load POT file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [store],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="w-full px-4">
      <div
        className={`relative flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 hover:border-muted-foreground/35'
        } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".pot"
          onChange={handleInputChange}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
        {isLoading ? (
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        ) : (
          <div className="bg-muted rounded-lg p-3">
            <Upload className="text-muted-foreground size-6" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium">
            {isLoading ? 'Updating...' : 'Drop a .pot file here'}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">or click to browse</p>
        </div>
      </div>
      <div className="text-muted-foreground mt-4 flex items-center justify-center gap-1.5 text-[11px]">
        <GitMerge className="size-3" />
        <span>Sync your .po file with an updated .pot template</span>
      </div>
    </div>
  );
}
