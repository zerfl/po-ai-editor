interface StyleSelectorProps {
  formality: string;
  tone: string;
  onFormalityChange: (formality: string) => void;
  onToneChange: (tone: string) => void;
}

export function StyleSelector({
  formality,
  tone,
  onFormalityChange,
  onToneChange,
}: StyleSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Formality</label>
        <select
          value={formality}
          onChange={(e) => onFormalityChange(e.target.value)}
          className="w-full mt-1 border rounded px-3 py-2 text-sm"
        >
          <option value="auto">Auto</option>
          <option value="formal">Formal</option>
          <option value="informal">Informal</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Tone</label>
        <select
          value={tone}
          onChange={(e) => onToneChange(e.target.value)}
          className="w-full mt-1 border rounded px-3 py-2 text-sm"
        >
          <option value="auto">Auto</option>
          <option value="friendly">Friendly</option>
          <option value="technical">Technical</option>
          <option value="neutral">Neutral</option>
        </select>
      </div>
    </div>
  );
}
