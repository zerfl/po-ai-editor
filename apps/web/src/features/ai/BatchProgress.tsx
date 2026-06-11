import { Progress } from '@/components/ui/progress';

interface BatchProgressProps {
  current: number;
  total: number;
  failed: number;
  onRetryFailed: () => void;
}

export function BatchProgress({ current, total, failed }: BatchProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Translating...</span>
        <span className="text-muted-foreground">
          {current}/{total} batches
          {failed > 0 && <span className="text-destructive ml-1">({failed} failed)</span>}
        </span>
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  );
}
