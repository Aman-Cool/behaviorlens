import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBehaviorLensStore, type EventFeedItem } from '@/stores/behaviorLensStore';
import { cn } from '@/lib/utils';

// --------------------------------------------------------------------------
// Action-colour mapping
// --------------------------------------------------------------------------

const actionDot: Record<string, string> = {
  click: 'bg-signal-blue',
  navigate: 'bg-signal-green',
  idle: 'bg-signal-yellow',
  abandon: 'bg-signal-red',
  scroll: 'bg-secondary',
  complete: 'bg-signal-green',
  confirm: 'bg-signal-green',
};

const actionLabel: Record<string, string> = {
  click: 'click',
  navigate: 'nav',
  idle: 'idle',
  abandon: 'abandon',
  scroll: 'scroll',
  complete: 'complete',
  confirm: 'confirm',
};

const actionTextColor: Record<string, string> = {
  click: 'text-signal-blue',
  navigate: 'text-signal-green',
  idle: 'text-signal-yellow',
  abandon: 'text-signal-red',
  scroll: 'text-secondary',
  complete: 'text-signal-green',
  confirm: 'text-signal-green',
};

function formatTime(tsMs: number): string {
  return new Date(tsMs).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// --------------------------------------------------------------------------
// Single event row
// --------------------------------------------------------------------------

function EventRow({ event }: { event: EventFeedItem }) {
  const dot = actionDot[event.action] ?? 'bg-secondary';
  const label = actionLabel[event.action] ?? event.action;
  const textColor = actionTextColor[event.action] ?? 'text-secondary';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-2.5 px-3 py-2 border-b border-border/50 hover:bg-panel-background/40 transition-colors group"
    >
      {/* Coloured action dot */}
      <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />

      {/* Timestamp */}
      <span className="text-[10px] font-mono text-secondary flex-shrink-0 w-16">
        {formatTime(event.timestamp)}
      </span>

      {/* User ID */}
      <span className="text-[10px] font-mono text-signal-blue truncate w-20 flex-shrink-0">
        {event.user_id}
      </span>

      {/* Action */}
      <span className={cn('text-[10px] font-mono font-medium flex-shrink-0 w-14', textColor)}>
        {label}
      </span>

      {/* Page */}
      <span className="text-[10px] font-mono text-secondary truncate flex-1 text-right">
        {event.page}
      </span>
    </motion.div>
  );
}

// --------------------------------------------------------------------------
// Panel
// --------------------------------------------------------------------------

export default function EventFeed() {
  const { eventFeed, isConnected } = useBehaviorLensStore();

  return (
    <div className="h-full bg-background border border-border rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-panel-background">
        <h2 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
          Live Events
        </h2>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'w-2 h-2 rounded-full transition-colors duration-500',
              isConnected ? 'bg-signal-green animate-pulse' : 'bg-signal-red',
            )}
          />
          <span
            className={cn(
              'text-[10px] font-mono',
              isConnected ? 'text-signal-green' : 'text-signal-red',
            )}
          >
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Feed */}
      <ScrollArea className="flex-1 font-mono text-xs">
        <div className="flex flex-col">
          <AnimatePresence initial={false}>
            {eventFeed.length > 0 ? (
              eventFeed.map((event) => (
                <EventRow key={event.id} event={event} />
              ))
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-secondary gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-secondary/40 animate-pulse" />
                <span className="text-[11px] font-paragraph">Waiting for events…</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
