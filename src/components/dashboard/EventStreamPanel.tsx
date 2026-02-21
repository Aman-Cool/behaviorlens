import { EventStream } from '@/entities';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface EventStreamPanelProps {
  events: EventStream[];
  isLoading: boolean;
  onUserClick: (userId: string) => void;
}

export default function EventStreamPanel({ events, isLoading, onUserClick }: EventStreamPanelProps) {
  const formatTimestamp = (date: Date | string | undefined) => {
    if (!date) return 'Unknown';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'HH:mm:ss');
  };

  const getActionColor = (actionType: string | undefined) => {
    switch (actionType?.toLowerCase()) {
      case 'click':
        return 'text-signal-blue';
      case 'idle':
        return 'text-signal-yellow';
      case 'navigation':
      case 'navigate':
        return 'text-signal-green';
      case 'abandonment':
      case 'abandon':
        return 'text-signal-red';
      default:
        return 'text-secondary';
    }
  };

  const getActionDot = (actionType: string | undefined) => {
    switch (actionType?.toLowerCase()) {
      case 'click':
        return 'bg-signal-blue';
      case 'idle':
        return 'bg-signal-yellow';
      case 'navigation':
      case 'navigate':
        return 'bg-signal-green';
      case 'abandonment':
      case 'abandon':
        return 'bg-signal-red';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <div className="bg-panel-background border border-border rounded-lg h-[calc(100vh-280px)] flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-heading font-semibold text-foreground">Event Stream</h2>
        <p className="text-xs text-secondary font-paragraph mt-1">Live activity feed</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? null : events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-secondary text-sm font-paragraph">
            No events
          </div>
        ) : (
          <div className="p-2">
            {events.map((event, index) => (
              <motion.div
                key={event._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.01 }}
                className="p-2 mb-1 rounded border border-transparent hover:border-border hover:bg-background/30 transition-all"
              >
                <div className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${getActionDot(event.actionType)}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <button
                        onClick={() => {
                          if (event.userId) onUserClick(event.userId);
                        }}
                        className="text-xs font-paragraph font-medium text-foreground hover:text-signal-blue transition-colors truncate"
                      >
                        {event.userId || 'Anonymous'}
                      </button>
                      <span className="text-xs text-secondary font-paragraph flex-shrink-0 tabular-nums">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    
                    <div className={`text-xs font-paragraph font-medium ${getActionColor(event.actionType)}`}>
                      {event.actionType || 'Unknown'}
                      {event.actionCategory && (
                        <span className="text-secondary ml-1">· {event.actionCategory}</span>
                      )}
                    </div>
                    
                    {event.target && (
                      <div className="text-xs text-secondary font-paragraph mt-0.5 truncate">
                        {event.target}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
