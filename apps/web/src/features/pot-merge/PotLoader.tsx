import { useCallback, useRef, useState, useEffect } from 'react';
import { usePoStore } from '../po/usePoStore';
import { parseFile } from '@/api/client';
import { toast } from 'sonner';
import { Upload, GitMerge, Loader2 } from 'lucide-react';

export function PotLoader() {
  const { state, dispatch } = usePoStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileRef = useRef(state.file);
  useEffect(() => {
    fileRef.current = state.file;
  }, [state.file]);

  const handleFile = useCallback(
    async (file: File) => {
      const currentFile = fileRef.current;
      if (!currentFile) return;
      setIsLoading(true);
      try {
        const content = await file.text();
        const result = await parseFile(content, file.name);

        const existingMsgids = new Set(currentFile.entries.map((e) => e.msgid));
        const potMsgids = new Set(result.entries.map((e) => e.msgid));

        const added = result.entries.filter((e) => !existingMsgids.has(e.msgid)).length;
        const removed = currentFile.entries.filter((e) => !potMsgids.has(e.msgid)).length;

        const parts: string[] = [];
        if (added > 0) parts.push(`${String(added)} new`);
        if (removed > 0) parts.push(`${String(removed)} removed`);

        dispatch({ type: 'MERGE_ENTRIES', payload: result });

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
    [dispatch],
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
