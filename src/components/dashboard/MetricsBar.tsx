import { DashboardMetrics } from '@/entities';
import MetricCard from '@/components/dashboard/MetricCard';

interface MetricsBarProps {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
}

export default function MetricsBar({ metrics, isLoading }: MetricsBarProps) {
  return (
    <div className="grid grid-cols-4 gap-6 p-6">
      <MetricCard
        label="Active Users"
        value={metrics?.activeUsersCount ?? 0}
        isLive
        isLoading={isLoading}
      />
      <MetricCard
        label="Total Events Processed"
        value={metrics?.totalEventsProcessed ?? 0}
        isLoading={isLoading}
      />
      <MetricCard
        label="Patterns Detected"
        value={metrics?.patternsDetectedCount ?? 0}
        isLoading={isLoading}
      />
      <MetricCard
        label="Abandonment Rate"
        value={metrics?.abandonmentRate ?? 0}
        suffix="%"
        isLoading={isLoading}
      />
    </div>
  );
}
