import { useCallback, useState } from 'react';
import { usePoStore } from '../po/usePoStore';
import { parseFile } from '@/api/client';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, GitMerge } from 'lucide-react';

export function PotLoader() {
  const { dispatch } = usePoStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const content = await file.text();
        const result = await parseFile(content, file.name);
        dispatch({ type: 'MERGE_ENTRIES', payload: result });
        toast.success(`Merged ${result.entries.length} entries from ${file.name}`);
      } catch (error) {
        toast.error(
          `Failed to load POT file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div>
      <Label className="text-[11px] flex items-center gap-1.5">
        <GitMerge className="size-3" />
        Update from POT file
      </Label>
      <div className="relative mt-2">
        <Input
          type="file"
          accept=".pot"
          onChange={handleInputChange}
          disabled={isLoading}
          className="h-8 text-xs file:text-xs file:font-medium file:text-foreground"
        />
      </div>
      {isLoading && (
        <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-[11px]">
          <Loader2 className="size-3 animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}
