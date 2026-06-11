interface BatchProgressProps {
  current: number;
  total: number;
  failed: number;
  onRetryFailed: () => void;
}

export function BatchProgress({ current, total, failed, onRetryFailed }: BatchProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>Translating...</span>
        <span>{current}/{total} batches</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {failed > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-destructive">{failed} batches failed</span>
          <button
            onClick={onRetryFailed}
            className="text-sm text-primary hover:underline"
          >
            Retry failed
          </button>
        </div>
      )}
    </div>
  );
}
