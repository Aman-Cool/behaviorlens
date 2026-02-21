import { motion } from 'framer-motion';
import { Activity, Users, AlertTriangle, TrendingDown } from 'lucide-react';
import { useBehaviorLensStore } from '@/stores/behaviorLensStore';
import { cn } from '@/lib/utils';

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

interface TileProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  delay: number;
}

function StatTile({ label, value, icon, accent, delay }: TileProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      className="bg-panel-background border border-border rounded-lg p-5 flex items-center gap-4 relative overflow-hidden group"
    >
      {/* Subtle corner glow */}
      <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none bg-white/5" />

      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', accent)}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs text-secondary font-paragraph mb-1 truncate">{label}</div>
        <motion.div
          key={String(value)}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="text-2xl font-heading font-bold text-foreground tabular-nums tracking-tight"
        >
          {value}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function StatsBar() {
  const { metrics } = useBehaviorLensStore();

  const totalEvents = metrics?.total_events?.toLocaleString() ?? '—';
  const activeUsers = metrics?.active_users ?? '—';
  const patternsDetected = metrics?.patterns_detected ?? '—';
  const abandonmentRate = metrics ? `${metrics.abandonment_rate.toFixed(1)}%` : '—';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4">
      <StatTile
        label="Total Events"
        value={totalEvents}
        icon={<Activity className="w-5 h-5 text-signal-blue" />}
        accent="bg-signal-blue/10"
        delay={0}
      />
      <StatTile
        label="Active Users"
        value={activeUsers}
        icon={<Users className="w-5 h-5 text-signal-green" />}
        accent="bg-signal-green/10"
        delay={0.07}
      />
      <StatTile
        label="Patterns Detected"
        value={patternsDetected}
        icon={<AlertTriangle className="w-5 h-5 text-signal-yellow" />}
        accent="bg-signal-yellow/10"
        delay={0.14}
      />
      <StatTile
        label="Abandonment Rate"
        value={abandonmentRate}
        icon={<TrendingDown className="w-5 h-5 text-signal-red" />}
        accent="bg-signal-red/10"
        delay={0.21}
      />
    </div>
  );
}
