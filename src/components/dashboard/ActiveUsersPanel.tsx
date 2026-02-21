import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserX } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useBehaviorLensStore, type ActiveUser } from '@/stores/behaviorLensStore';
import { cn } from '@/lib/utils';

// --------------------------------------------------------------------------
// Relative-time formatting, updated every second via a ticker.
// --------------------------------------------------------------------------

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function relativeTime(tsMs: number, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((nowMs - tsMs) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return `${Math.floor(diffSec / 3600)}h ago`;
}

// --------------------------------------------------------------------------
// Single user row
// --------------------------------------------------------------------------

function UserRow({ user, now }: { user: ActiveUser; now: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors',
        user.has_active_pattern
          ? 'border-signal-blue/30 bg-signal-blue/5'
          : 'border-transparent hover:border-border hover:bg-panel-background/60',
      )}
    >
      {/* Active-pattern left accent bar */}
      {user.has_active_pattern && (
        <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-signal-blue" />
      )}

      {/* Avatar + amber dot for active-pattern users */}
      <div className="relative flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-mono text-secondary">
          {user.user_id.slice(-2).toUpperCase()}
        </div>
        {user.has_active_pattern && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-signal-yellow border border-background" />
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-foreground truncate">{user.user_id}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge
            className="text-[9px] px-1.5 py-0 h-4 bg-background border-border text-secondary font-mono truncate max-w-[100px]"
            variant="outline"
          >
            {user.current_page}
          </Badge>
        </div>
      </div>

      {/* Last seen */}
      <div className="text-[10px] text-secondary font-mono flex-shrink-0">
        {relativeTime(user.last_seen, now)}
      </div>
    </motion.div>
  );
}

// --------------------------------------------------------------------------
// Panel
// --------------------------------------------------------------------------

export default function ActiveUsersPanel() {
  const { activeUsers } = useBehaviorLensStore();
  const now = useNow();

  return (
    <div className="h-full bg-panel-background border border-border rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-green animate-pulse" />
          Active Users
        </h2>
        <Badge className="bg-background border-border text-secondary text-xs font-mono" variant="outline">
          {activeUsers.length}
        </Badge>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <AnimatePresence initial={false}>
            {activeUsers.length > 0 ? (
              activeUsers.map((user) => (
                <UserRow key={user.user_id} user={user} now={now} />
              ))
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-secondary gap-3"
              >
                <UserX className="w-8 h-8 opacity-40" />
                <span className="text-xs font-paragraph">No active users</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
