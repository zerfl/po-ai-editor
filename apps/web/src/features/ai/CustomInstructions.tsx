interface CustomInstructionsProps {
  value: string;
  onChange: (value: string) => void;
}

export function CustomInstructions({ value, onChange }: CustomInstructionsProps) {
  return (
    <div>
      <label className="text-sm font-medium">Custom Instructions</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., Use formal German, preserve brand names..."
        className="w-full mt-1 border rounded px-3 py-2 text-sm min-h-[80px]"
      />
    </div>
  );
}
