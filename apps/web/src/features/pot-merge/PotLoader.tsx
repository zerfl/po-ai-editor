import { useCallback, useState } from 'react';
import { usePoStore } from '../po/usePoStore';
import { parseFile } from '@/api/client';
import { toast } from 'sonner';
import type { PoFile } from '@po-ai-editor/shared';

export function PotLoader() {
  const { dispatch } = usePoStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const content = await file.text();
      const result = await parseFile(content, file.name);
      dispatch({ type: 'MERGE_ENTRIES', payload: result });
      toast.success(`Merged ${result.entries.length} entries from ${file.name}`);
    } catch (error) {
      toast.error(`Failed to load POT file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Update from POT file</label>
      <div className="relative">
        <input
          type="file"
          accept=".pot"
          onChange={handleInputChange}
          className="w-full border rounded px-3 py-2 text-sm"
          disabled={isLoading}
        />
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
    </div>
  );
}
