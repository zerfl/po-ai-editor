import { usePoStore } from '../po/usePoStore';
import { exportPo, exportMo } from '@/api/client';
import { toast } from 'sonner';

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
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Export</h3>
      <div className="flex gap-2">
        <button
          onClick={handleExportPo}
          className="flex-1 border px-3 py-2 rounded text-sm hover:bg-muted"
        >
          Export .po
        </button>
        <button
          onClick={handleExportMo}
          className="flex-1 border px-3 py-2 rounded text-sm hover:bg-muted"
        >
          Generate .mo
        </button>
      </div>
    </div>
  );
}
