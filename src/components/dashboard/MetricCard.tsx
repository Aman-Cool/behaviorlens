import { motion } from 'framer-motion';

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  isLive?: boolean;
  isLoading?: boolean;
}

export default function MetricCard({ label, value, suffix = '', isLive = false, isLoading = false }: MetricCardProps) {
  return (
    <div className="bg-panel-background border border-border rounded-lg p-6">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-secondary font-paragraph">{label}</span>
        {isLive && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-signal-green rounded-full animate-pulse" />
            <span className="text-xs text-signal-green font-paragraph">Live</span>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="h-10 bg-background/50 rounded animate-pulse" />
      ) : (
        <motion.div
          key={value}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 0.3 }}
          className="text-4xl font-heading font-bold text-foreground tabular-nums"
        >
          {value.toLocaleString()}{suffix}
        </motion.div>
      )}
      
      <div className="mt-2 text-xs text-secondary font-paragraph">
        Updated {Math.floor(Math.random() * 10) + 1}s ago
      </div>
    </div>
  );
}
