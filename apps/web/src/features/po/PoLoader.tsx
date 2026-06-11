import { useCallback, useState } from 'react';
import { usePoStore } from './usePoStore';
import { parseFile } from '@/api/client';
import { toast } from 'sonner';
import { Upload, FileText, Loader2 } from 'lucide-react';

export function PoLoader() {
  const { dispatch } = usePoStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const content = await file.text();
        const result = await parseFile(content, file.name);
        dispatch({ type: 'LOAD_FILE', payload: result });
        toast.success(
          `Loaded ${result.entries.length} entries from ${file.name}`
        );
      } catch (error) {
        toast.error(
          `Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
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
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="w-full max-w-md px-4">
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
          accept=".po,.pot"
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
            {isLoading ? 'Loading...' : 'Drop a .po or .pot file here'}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            or click to browse
          </p>
        </div>
      </div>
      <div className="text-muted-foreground mt-4 flex items-center justify-center gap-1.5 text-[11px]">
        <FileText className="size-3" />
        <span>Supports gettext .po and .pot translation files</span>
      </div>
    </div>
  );
}
