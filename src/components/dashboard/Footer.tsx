import { format } from 'date-fns';

interface FooterProps {
  lastUpdated?: Date | string;
}

export default function Footer({ lastUpdated }: FooterProps) {
  const formatTimestamp = (date: Date | string | undefined) => {
    if (!date) return 'Never';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM dd, yyyy HH:mm:ss');
  };

  return (
    <footer className="fixed bottom-0 left-16 right-0 bg-panel-background border-t border-border z-10">
      <div className="max-w-[1920px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-signal-green rounded-full" />
            <span className="text-xs text-secondary font-paragraph">System Operational</span>
          </div>
        </div>
        
        <div className="text-xs text-secondary font-paragraph">
          Last refresh: {formatTimestamp(lastUpdated)}
        </div>
      </div>
    </footer>
  );
}
