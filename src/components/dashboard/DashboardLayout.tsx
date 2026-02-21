import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useBehaviorLensStore } from '@/stores/behaviorLensStore';
import StatsBar from '@/components/dashboard/StatsBar';
import ActiveUsersPanel from '@/components/dashboard/ActiveUsersPanel';
import PatternCards from '@/components/dashboard/PatternCards';
import EventFeed from '@/components/dashboard/EventFeed';
import { cn } from '@/lib/utils';

// --------------------------------------------------------------------------
// Topbar
// --------------------------------------------------------------------------

function Topbar() {
  const { isConnected, lastUpdated } = useBehaviorLensStore();

  const updatedText = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

  return (
    <header className="flex-shrink-0 border-b border-border bg-panel-background/80 backdrop-blur-sm">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-signal-blue to-signal-purple flex items-center justify-center shadow-md shadow-signal-blue/20">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-heading font-semibold text-foreground tracking-tight">
            BehaviorLens
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-paragraph text-secondary hidden sm:block">
            Updated {updatedText}
          </span>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors duration-500',
                isConnected ? 'bg-signal-green animate-pulse' : 'bg-signal-red',
              )}
            />
            <span
              className={cn(
                'text-xs font-paragraph',
                isConnected ? 'text-signal-green' : 'text-signal-red',
              )}
            >
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

// --------------------------------------------------------------------------
// Background grid decoration
// --------------------------------------------------------------------------

function GridOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-0 opacity-[0.025]"
      style={{
        backgroundImage:
          'linear-gradient(#232833 1px, transparent 1px), linear-gradient(90deg, #232833 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    />
  );
}

// --------------------------------------------------------------------------
// Layout
// --------------------------------------------------------------------------

export default function DashboardLayout() {
  const { startPolling, stopPolling } = useBehaviorLensStore();

  useEffect(() => {
    startPolling();
    return () => {
      stopPolling();
    };
  }, []);

  return (
    <div className="h-screen w-full bg-background text-foreground font-paragraph overflow-hidden flex flex-col relative">
      <GridOverlay />

      {/* Topbar */}
      <Topbar />

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex-shrink-0 border-b border-border relative z-10"
      >
        <StatsBar />
      </motion.div>

      {/* Three-column panel grid — gridTemplateRows: 1fr ensures panels fill all remaining height */}
      <div
        className="flex-1 overflow-hidden p-4 gap-4 grid relative z-10"
        style={{ gridTemplateColumns: '1fr 2fr 1fr', gridTemplateRows: '1fr' }}
      >
        {/* 25 % — Active Users */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="h-full overflow-hidden"
        >
          <ActiveUsersPanel />
        </motion.div>

        {/* 50 % — Pattern Cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="h-full overflow-hidden"
        >
          <PatternCards />
        </motion.div>

        {/* 25 % — Event Feed */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="h-full overflow-hidden"
        >
          <EventFeed />
        </motion.div>
      </div>
    </div>
  );
}
