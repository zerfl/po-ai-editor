import { selectHasFile, usePoStore, usePoStoreApi, toPoFile } from '../po/store';
import { exportPo, exportMo } from '@/api/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileDown, FileCode } from 'lucide-react';

export function ExportButtons() {
  const hasFile = usePoStore(selectHasFile);
  const store = usePoStoreApi();

  if (!hasFile) return null;

  const handleExportPo = async () => {
    const file = toPoFile(store.getState());
    if (!file) return;

    try {
      const blob = await exportPo({
        entries: file.entries,
        metadata: file.metadata,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename.replace(/\.(po|pot)$/, '.po');
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported .po file');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    }
  };

  const handleExportMo = async () => {
    const file = toPoFile(store.getState());
    if (!file) return;

    try {
      const blob = await exportMo({
        entries: file.entries,
        metadata: file.metadata,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename.replace(/\.(po|pot)$/, '.mo');
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Generated .mo binary');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    }
  };

  return (
    <div>
      <Label className="text-[11px]">Export</Label>
      <div className="mt-2 flex gap-2">
        <Button
          onClick={() => void handleExportPo()}
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
        >
          <FileDown />
          .po file
        </Button>
        <Button
          onClick={() => void handleExportMo()}
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
        >
          <FileCode />
          .mo binary
        </Button>
      </div>
    </div>
  );
}
