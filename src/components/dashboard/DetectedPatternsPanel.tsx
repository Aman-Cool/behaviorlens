import { useState } from 'react';
import { DetectedPatterns } from '@/entities';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import PatternBadge from '@/components/dashboard/PatternBadge';
import SeverityIndicator from '@/components/dashboard/SeverityIndicator';

interface DetectedPatternsPanelProps {
  patterns: DetectedPatterns[];
  isLoading: boolean;
  onUserClick: (userId: string) => void;
}

export default function DetectedPatternsPanel({ patterns, isLoading, onUserClick }: DetectedPatternsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatTimestamp = (date: Date | string | undefined) => {
    if (!date) return 'Unknown';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-panel-background border border-border rounded-lg h-[calc(100vh-280px)] flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-heading font-semibold text-foreground">Detected Patterns</h2>
        <p className="text-xs text-secondary font-paragraph mt-1">{patterns.length} patterns identified</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? null : patterns.length === 0 ? (
          <div className="flex items-center justify-center h-full text-secondary text-sm font-paragraph">
            No patterns detected
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {patterns.map((pattern, index) => (
              <motion.div
                key={pattern._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="relative bg-background border border-border rounded-lg overflow-hidden hover:border-signal-purple/50 transition-colors"
              >
                <SeverityIndicator severity={pattern.severity} />
                
                <button
                  onClick={() => toggleExpand(pattern._id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between mb-2">
                    <PatternBadge type={pattern.patternType} />
                    <button
                      className="text-secondary hover:text-foreground transition-colors"
                      aria-label={expandedId === pattern._id ? 'Collapse' : 'Expand'}
                    >
                      {expandedId === pattern._id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (pattern.userId) onUserClick(pattern.userId);
                      }}
                      className="text-sm font-paragraph text-foreground hover:text-signal-blue transition-colors"
                    >
                      User: {pattern.userId || 'Unknown'}
                    </button>
                    <div className="text-xs text-secondary font-paragraph">
                      Page: {pattern.page || 'Unknown'}
                    </div>
                    <div className="text-xs text-secondary font-paragraph">
                      {formatTimestamp(pattern.detectionTimestamp)}
                    </div>
                  </div>
                </button>
                
                <AnimatePresence>
                  {expandedId === pattern._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border"
                    >
                      <div className="p-4 space-y-3">
                        <div>
                          <div className="text-xs text-secondary font-paragraph mb-1">Explanation</div>
                          <div className="text-sm text-foreground font-paragraph">
                            {pattern.explanation || 'No explanation available'}
                          </div>
                        </div>
                        
                        {pattern.eventContextSummary && (
                          <div>
                            <div className="text-xs text-secondary font-paragraph mb-2">Event Context</div>
                            <div className="bg-panel-background rounded p-2 text-xs text-foreground font-paragraph font-mono">
                              {pattern.eventContextSummary}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
