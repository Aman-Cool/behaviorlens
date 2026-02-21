import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, ChevronDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { useBehaviorLensStore, type Pattern } from '@/stores/behaviorLensStore';
import { cn } from '@/lib/utils';

// --------------------------------------------------------------------------
// Type-colour mappings
// --------------------------------------------------------------------------

const typeConfig = {
  hesitation: {
    label: 'Hesitation',
    badge: 'bg-signal-yellow/15 text-signal-yellow border-signal-yellow/30',
    bar: 'bg-signal-yellow',
  },
  'navigation-loop': {
    label: 'Nav Loop',
    badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    bar: 'bg-orange-500',
  },
  abandonment: {
    label: 'Abandonment',
    badge: 'bg-signal-red/15 text-signal-red border-signal-red/30',
    bar: 'bg-signal-red',
  },
} as const;

const severityConfig = {
  low: 'bg-secondary/20 text-secondary border-secondary/30',
  medium: 'bg-signal-yellow/15 text-signal-yellow border-signal-yellow/30',
  high: 'bg-signal-red/15 text-signal-red border-signal-red/30',
} as const;

function formatTime(tsMs: number): string {
  return new Date(tsMs).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// --------------------------------------------------------------------------
// Single pattern card
// --------------------------------------------------------------------------

function PatternCard({ pattern }: { pattern: Pattern }) {
  const [open, setOpen] = useState(false);

  const tc = typeConfig[pattern.type] ?? typeConfig.hesitation;
  const sc = severityConfig[pattern.severity] ?? severityConfig.low;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative bg-background border border-border rounded-lg overflow-hidden"
      style={{ background: '#0F1115' }}
    >
      {/* Severity accent bar on left edge */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-0.5 rounded-r-sm', tc.bar)} />

      <Collapsible open={open} onOpenChange={setOpen}>
        {/* Card header — acts as trigger */}
        <CollapsiblePrimitive.CollapsibleTrigger asChild>
          <button className="w-full pl-4 pr-3 py-3 text-left flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <Badge
                  className={cn('text-[10px] px-1.5 py-0 h-4 border font-medium', tc.badge)}
                >
                  {tc.label}
                </Badge>
                <Badge
                  className={cn('text-[10px] px-1.5 py-0 h-4 border font-medium', sc)}
                >
                  {pattern.severity}
                </Badge>
                {pattern.resolved && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-secondary/10 text-secondary border-secondary/20">
                    resolved
                  </Badge>
                )}
              </div>
              <div className="text-sm font-paragraph text-foreground truncate">
                <span className="font-mono text-signal-blue text-xs">{pattern.user_id}</span>
                <span className="text-secondary mx-1">·</span>
                <span className="text-secondary text-xs">{pattern.page}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
              <span className="text-[10px] font-mono text-secondary">
                {formatTime(pattern.detected_at)}
              </span>
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 text-secondary transition-transform duration-200',
                  open && 'rotate-180',
                )}
              />
            </div>
          </button>
        </CollapsiblePrimitive.CollapsibleTrigger>

        <CollapsibleContent className="border-t border-border bg-panel-background/60 mt-0 px-0 py-0 rounded-none">
          <div className="pl-5 pr-4 py-3 space-y-2">
            <p className="text-xs font-paragraph text-foreground leading-relaxed">
              {pattern.explanation}
            </p>
            <div className="flex items-center gap-1 text-[10px] font-mono text-secondary">
              <span className="text-secondary/60">id:</span>
              <span>{pattern.pattern_id}</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

// --------------------------------------------------------------------------
// Panel
// --------------------------------------------------------------------------

export default function PatternCards() {
  const { patterns } = useBehaviorLensStore();

  return (
    <div className="h-full bg-panel-background border border-border rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
          <Eye className="w-4 h-4 text-secondary" />
          Detected Patterns
        </h2>
        <Badge className="bg-background border-border text-secondary text-xs font-mono" variant="outline">
          {patterns.length}
        </Badge>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          <AnimatePresence initial={false}>
            {patterns.length > 0 ? (
              patterns.map((p) => (
                <PatternCard key={p.pattern_id} pattern={p} />
              ))
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-secondary gap-3"
              >
                <Eye className="w-10 h-10 opacity-30" />
                <span className="text-xs font-paragraph">Watching for patterns…</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
