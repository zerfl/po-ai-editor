import { usePoStore } from '../po/usePoStore';
import { exportPo, exportMo } from '@/api/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileDown, FileCode } from 'lucide-react';

export function ExportButtons() {
  const { state } = usePoStore();

  if (!state.file) return null;

  const handleExportPo = async () => {
    try {
      const blob = await exportPo({
        entries: state.file!.entries,
        metadata: state.file!.metadata,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = state.file!.filename.replace(/\.(po|pot)$/, '.po');
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported .po file');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleExportMo = async () => {
    try {
      const blob = await exportMo({
        entries: state.file!.entries,
        metadata: state.file!.metadata,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = state.file!.filename.replace(/\.(po|pot)$/, '.mo');
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Generated .mo file');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  return (
    <div>
      <Label className="text-[11px]">Export</Label>
      <div className="mt-2 flex gap-2">
        <Button
          onClick={handleExportPo}
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
        >
          <FileDown />
          .po file
        </Button>
        <Button
          onClick={handleExportMo}
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
