import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Formality, Tone } from '@po-ai-editor/shared';

interface StyleSelectorProps {
  formality: Formality;
  tone: Tone;
  onFormalityChange: (formality: Formality) => void;
  onToneChange: (tone: Tone) => void;
}

export function StyleSelector({
  formality,
  tone,
  onFormalityChange,
  onToneChange,
}: StyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label className="text-[11px]">Formality</Label>
        <Select value={formality} onValueChange={onFormalityChange}>
          <SelectTrigger className="mt-1 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto" className="text-xs">
              Auto
            </SelectItem>
            <SelectItem value="formal" className="text-xs">
              Formal
            </SelectItem>
            <SelectItem value="informal" className="text-xs">
              Informal
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[11px]">Tone</Label>
        <Select value={tone} onValueChange={onToneChange}>
          <SelectTrigger className="mt-1 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto" className="text-xs">
              Auto
            </SelectItem>
            <SelectItem value="friendly" className="text-xs">
              Friendly
            </SelectItem>
            <SelectItem value="technical" className="text-xs">
              Technical
            </SelectItem>
            <SelectItem value="neutral" className="text-xs">
              Neutral
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
