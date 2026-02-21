import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BaseCrudService } from '@/integrations';
import { EventStream } from '@/entities';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface UserTimelineModalProps {
  userId: string;
  onClose: () => void;
}

export default function UserTimelineModal({ userId, onClose }: UserTimelineModalProps) {
  const [events, setEvents] = useState<EventStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserEvents();
  }, [userId]);

  const loadUserEvents = async () => {
    setIsLoading(true);
    try {
      const result = await BaseCrudService.getAll<EventStream>('eventstream', {}, { limit: 100 });
      const userEvents = result.items.filter(event => event.userId === userId);
      setEvents(userEvents.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateA - dateB;
      }));
    } catch (error) {
      console.error('Error loading user events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventColor = (actionType: string | undefined) => {
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

  const formatTimestamp = (date: Date | string | undefined) => {
    if (!date) return 'Unknown';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'HH:mm:ss');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-panel-background border border-border rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-xl font-heading font-semibold text-foreground">User Behavioral Timeline</h2>
              <p className="text-sm text-secondary font-paragraph mt-1">User ID: {userId}</p>
            </div>
            <button
              onClick={onClose}
              className="text-secondary hover:text-foreground transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : events.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-secondary text-sm font-paragraph">
                No events found for this user
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                {/* Events */}
                <div className="space-y-6">
                  {events.map((event, index) => (
                    <motion.div
                      key={event._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative pl-12"
                    >
                      {/* Event marker */}
                      <div className={`absolute left-2 top-1 w-5 h-5 rounded-full border-2 border-panel-background ${getEventColor(event.actionType)}`} />

                      {/* Event content */}
                      <div className="bg-background border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-paragraph font-medium ${
                              event.actionType?.toLowerCase() === 'click' ? 'text-signal-blue' :
                              event.actionType?.toLowerCase() === 'idle' ? 'text-signal-yellow' :
                              event.actionType?.toLowerCase() === 'navigation' || event.actionType?.toLowerCase() === 'navigate' ? 'text-signal-green' :
                              event.actionType?.toLowerCase() === 'abandonment' || event.actionType?.toLowerCase() === 'abandon' ? 'text-signal-red' :
                              'text-secondary'
                            }`}>
                              {event.actionType || 'Unknown'}
                            </span>
                            {event.actionCategory && (
                              <span className="text-xs text-secondary font-paragraph">
                                · {event.actionCategory}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-secondary font-paragraph tabular-nums">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>

                        {event.target && (
                          <div className="text-sm text-foreground font-paragraph">
                            {event.target}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
