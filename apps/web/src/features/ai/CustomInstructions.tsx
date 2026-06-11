import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CustomInstructionsProps {
  value: string;
  onChange: (value: string) => void;
}

export function CustomInstructions({
  value,
  onChange,
}: CustomInstructionsProps) {
  return (
    <div>
      <Label className="text-[11px]">Custom Instructions</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., Use formal German, preserve brand names..."
        className="mt-1 text-xs min-h-[60px] resize-y"
      />
    </div>
  );
}
