import { useState, useEffect } from 'react';
import { getModels } from '@/api/client';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Model {
  id: string;
  label: string;
}

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getModels()
      .then((data) => {
        setModels(data.models);
        if (!value) onChange(data.defaultModel);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Label className="text-[11px]">Model</Label>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="mt-1 h-8 text-xs">
          <SelectValue placeholder={loading ? 'Loading...' : 'Select model'} />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id} className="text-xs">
              {model.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
