// HPI 1.7-G
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { 
  Activity, 
  Users, 
  AlertTriangle, 
  Zap, 
  LayoutDashboard, 
  Settings, 
  Search, 
  Clock, 
  ChevronRight, 
  ChevronDown, 
  Terminal, 
  MousePointer2, 
  AlertOctagon, 
  ArrowUpRight,
  MoreHorizontal,
  X
} from 'lucide-react';
import { BaseCrudService } from '@/integrations';
import { DashboardMetrics, ActiveUsers, DetectedPatterns, EventStream } from '@/entities';
import Header from '@/components/dashboard/Header';
import Footer from '@/components/dashboard/Footer';
import { cn } from '@/lib/utils';

// --- Types & Interfaces ---

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  icon?: React.ReactNode;
  delay?: number;
}

interface PatternCardProps {
  pattern: DetectedPatterns;
  onClick: (id: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

// --- Utility Components ---

const StatusDot = ({ color, pulse = false }: { color: string; pulse?: boolean }) => (
  <div className="relative flex items-center justify-center w-3 h-3">
    {pulse && (
      <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", color)}></span>
    )}
    <span className={cn("relative inline-flex rounded-full h-2 w-2", color)}></span>
  </div>
);

const SeverityStrip = ({ severity }: { severity: string }) => {
  const color = 
    severity === 'high' ? 'bg-signal-red' : 
    severity === 'medium' ? 'bg-signal-yellow' : 
    'bg-signal-blue';
  
  return <div className={cn("w-1 h-full absolute left-0 top-0 bottom-0 rounded-l-md", color)} />;
};

// --- Main Component ---

export default function HomePage() {
  // --- 1. Data Fidelity Protocol: Canonical Data Sources ---
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUsers[]>([]);
  const [patterns, setPatterns] = useState<DetectedPatterns[]>([]);
  const [events, setEvents] = useState<EventStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // UI State
  const [expandedPatternId, setExpandedPatternId] = useState<string | null>(null);

  // --- Data Fetching Logic (Preserved) ---
  useEffect(() => {
    loadDashboardData();
    
    // Simulate real-time updates every 5 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [metricsResult, usersResult, patternsResult, eventsResult] = await Promise.all([
        BaseCrudService.getAll<DashboardMetrics>('dashboardmetrics', {}, { limit: 1 }),
        BaseCrudService.getAll<ActiveUsers>('activeusers', {}, { limit: 50 }),
        BaseCrudService.getAll<DetectedPatterns>('detectedpatterns', {}, { limit: 20 }),
        BaseCrudService.getAll<EventStream>('eventstream', {}, { limit: 50 })
      ]);

      if (metricsResult.items.length > 0) {
        setMetrics(metricsResult.items[0]);
      }
      setActiveUsers(usersResult.items);
      setPatterns(patternsResult.items);
      setEvents(eventsResult.items);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setIsLoading(false);
    }
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleCloseModal = () => {
    setSelectedUserId(null);
  };

  // --- Motion & Parallax Setup ---
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });
  const headerY = useTransform(scrollY, [0, 100], [0, -10]);
  
  // --- Render Helpers ---
  
  const formatTimeAgo = (date?: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  };

  return (
    <div className="flex h-screen w-full bg-[#0F1115] text-[#E6EAF0] font-paragraph overflow-hidden selection:bg-signal-blue/20">
      {/* --- Left Navigation Bar (Collapsed) --- */}
      <aside className="w-16 flex-shrink-0 border-r border-[#232833] bg-[#0F1115] flex flex-col items-center py-6 z-50">
        <div className="mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-signal-blue to-signal-purple flex items-center justify-center shadow-lg shadow-signal-blue/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <nav className="flex-1 flex flex-col gap-6 w-full px-2">
          {[
            { icon: LayoutDashboard, label: 'Dashboard', active: true },
            { icon: Users, label: 'Users', active: false },
            { icon: AlertOctagon, label: 'Patterns', active: false },
            { icon: Zap, label: 'Events', active: false },
          ].map((item, idx) => (
            <button 
              key={idx}
              className={cn(
                "w-full aspect-square flex items-center justify-center rounded-lg transition-all duration-200 group relative",
                item.active ? "bg-[#171A21] text-signal-blue" : "text-[#8B93A7] hover:text-[#E6EAF0] hover:bg-[#171A21]/50"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.active && (
                <motion.div 
                  layoutId="nav-indicator"
                  className="absolute left-0 top-2 bottom-2 w-0.5 bg-signal-blue rounded-r-full"
                />
              )}
              <div className="absolute left-full ml-4 px-2 py-1 bg-[#171A21] border border-[#232833] rounded text-xs text-[#E6EAF0] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.label}
              </div>
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-6 w-full px-2">
          <button className="w-full aspect-square flex items-center justify-center rounded-lg text-[#8B93A7] hover:text-[#E6EAF0] hover:bg-[#171A21]/50 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#171A21] border border-[#232833] flex items-center justify-center text-xs font-medium text-[#8B93A7]">
            JD
          </div>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Background Grid Effect */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" 
             style={{ 
               backgroundImage: 'linear-gradient(#232833 1px, transparent 1px), linear-gradient(90deg, #232833 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
             }} 
        />

        {/* Header Import */}
        <div className="z-40 bg-[#0F1115]/80 backdrop-blur-md border-b border-[#232833]">
           <Header />
        </div>

        {/* Scrollable Dashboard Content */}
        <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 scrollbar-thin scrollbar-thumb-[#232833] scrollbar-track-transparent">
          
          {/* --- Top Metrics Bar --- */}
          <motion.div 
            style={{ y: headerY }}
            className="sticky top-0 z-30 bg-[#0F1115]/90 backdrop-blur-xl border-b border-[#232833] px-8 py-6"
          >
            <div className="max-w-[120rem] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard 
                label="Active Users" 
                value={metrics?.activeUsersCount || 0} 
                subtext="Currently online"
                color="text-signal-blue"
                icon={<StatusDot color="bg-signal-blue" pulse />}
                delay={0}
              />
              <MetricCard 
                label="Events Processed" 
                value={metrics?.totalEventsProcessed?.toLocaleString() || '0'} 
                subtext="Last 24 hours"
                color="text-[#E6EAF0]"
                icon={<Zap className="w-4 h-4 text-[#8B93A7]" />}
                delay={0.1}
              />
              <MetricCard 
                label="Patterns Detected" 
                value={metrics?.patternsDetectedCount || 0} 
                subtext="Requires attention"
                color="text-signal-purple"
                icon={<AlertOctagon className="w-4 h-4 text-signal-purple" />}
                delay={0.2}
              />
              <MetricCard 
                label="Abandonment Rate" 
                value={`${metrics?.abandonmentRate || 0}%`} 
                subtext="vs. last hour"
                color="text-signal-red"
                icon={<Activity className="w-4 h-4 text-signal-red" />}
                delay={0.3}
              />
            </div>
          </motion.div>

          {/* --- Dashboard Grid --- */}
          <div className="max-w-[120rem] mx-auto p-8">
            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-240px)] min-h-[600px]">
              
              {/* --- Left Panel: Active Users --- */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="col-span-3 bg-[#171A21] border border-[#232833] rounded-xl flex flex-col overflow-hidden shadow-2xl shadow-black/20 relative group"
              >
                {/* Subtle glow effect - very smooth and non-distracting */}
                <div className="absolute -inset-0.5 bg-gradient-to-b from-signal-blue/3 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-50 transition-opacity duration-1500 pointer-events-none" />
                <div className="absolute inset-0 bg-radial-gradient from-signal-blue/2 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-1500 pointer-events-none blur-2xl" />
                
                <div className="p-4 border-b border-[#232833] flex items-center justify-between bg-[#171A21]/50 backdrop-blur-sm sticky top-0 z-20 relative">
                  <h2 className="font-heading font-semibold text-sm text-[#E6EAF0] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#8B93A7]" />
                    Active Users
                  </h2>
                  <span className="text-xs font-mono text-[#8B93A7] bg-[#232833] px-2 py-0.5 rounded-full">
                    {activeUsers.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-[#232833]">
                  <AnimatePresence>
                    {activeUsers.map((user, i) => (
                      <motion.div
                        key={user._id || i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => user.userId && handleUserClick(user.userId)}
                        className="group flex items-center gap-3 p-3 rounded-lg hover:bg-[#232833]/50 cursor-pointer transition-all border border-transparent hover:border-[#232833]"
                      >
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-[#0F1115] border border-[#232833] flex items-center justify-center text-xs font-mono text-[#8B93A7]">
                            {user.userId?.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <StatusDot 
                              color={
                                user.status === 'active' ? 'bg-signal-green' : 
                                user.status === 'idle' ? 'bg-signal-yellow' : 'bg-[#8B93A7]'
                              } 
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm font-medium text-[#E6EAF0] truncate font-mono">
                              {user.userId}
                            </span>
                            <span className="text-[10px] text-[#8B93A7]">
                              {formatTimeAgo(user.lastSeen)}
                            </span>
                          </div>
                          <div className="text-xs text-[#8B93A7] truncate flex items-center gap-1">
                            <MousePointer2 className="w-3 h-3" />
                            {user.currentPage || '/'}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#232833] group-hover:text-[#8B93A7] transition-colors" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {activeUsers.length === 0 && !isLoading && (
                    <div className="p-8 text-center text-[#8B93A7] text-sm">No active users</div>
                  )}
                </div>
              </motion.div>

              {/* --- Center Panel: Detected Patterns (Primary Focus) --- */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="col-span-5 bg-[#171A21] border border-[#232833] rounded-xl flex flex-col overflow-hidden shadow-2xl shadow-black/20 relative group"
              >
                {/* Subtle glow effect - very smooth and non-distracting */}
                <div className="absolute -inset-0.5 bg-gradient-to-b from-signal-purple/3 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-50 transition-opacity duration-1500 pointer-events-none" />
                <div className="absolute inset-0 bg-radial-gradient from-signal-purple/2 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-1500 pointer-events-none blur-2xl" />
                
                <div className="p-4 border-b border-[#232833] flex items-center justify-between bg-[#171A21]/50 backdrop-blur-sm sticky top-0 z-20 relative">
                  <h2 className="font-heading font-semibold text-sm text-[#E6EAF0] flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-signal-purple" />
                    Detected Patterns
                  </h2>
                  <div className="flex gap-2">
                    <button className="p-1.5 hover:bg-[#232833] rounded text-[#8B93A7] transition-colors">
                      <Search className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 hover:bg-[#232833] rounded text-[#8B93A7] transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-[#232833]">
                  <AnimatePresence mode="popLayout">
                    {patterns.map((pattern, i) => (
                      <PatternCard 
                        key={pattern._id || i}
                        pattern={pattern}
                        isExpanded={expandedPatternId === pattern._id}
                        onToggle={() => setExpandedPatternId(expandedPatternId === pattern._id ? null : pattern._id)}
                        onClick={(id) => handleUserClick(id)}
                      />
                    ))}
                  </AnimatePresence>
                  {patterns.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-[#8B93A7] opacity-50">
                      <AlertOctagon className="w-12 h-12 mb-4" />
                      <p>No patterns detected</p>
                    </div>
                  )}
                </div>
                
                {/* Decorative Gradient at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#171A21] to-transparent pointer-events-none" />
              </motion.div>

              {/* --- Right Panel: Event Stream --- */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="col-span-4 bg-[#0F1115] border border-[#232833] rounded-xl flex flex-col overflow-hidden shadow-2xl shadow-black/20 relative group"
              >
                {/* Subtle glow effect - very smooth and non-distracting */}
                <div className="absolute -inset-0.5 bg-gradient-to-b from-signal-green/3 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-50 transition-opacity duration-1500 pointer-events-none" />
                <div className="absolute inset-0 bg-radial-gradient from-signal-green/2 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-1500 pointer-events-none blur-2xl" />
                
                <div className="p-4 border-b border-[#232833] flex items-center justify-between bg-[#171A21] sticky top-0 z-20 relative">
                  <h2 className="font-heading font-semibold text-sm text-[#E6EAF0] flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-signal-green" />
                    Event Stream
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-signal-green animate-pulse" />
                    <span className="text-xs font-mono text-signal-green">LIVE</span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-0 font-mono text-xs scrollbar-thin scrollbar-thumb-[#232833]">
                  <div className="flex flex-col">
                    <AnimatePresence initial={false}>
                      {events.map((event, i) => (
                        <motion.div
                          key={event._id || i}
                          initial={{ opacity: 0, height: 0, x: -20 }}
                          animate={{ opacity: 1, height: 'auto', x: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-b border-[#232833]/50 hover:bg-[#171A21] transition-colors group"
                        >
                          <div className="p-3 grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3 text-[#8B93A7]">
                              {new Date(event.timestamp || '').toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className="col-span-3 text-signal-blue truncate">
                              {event.userId}
                            </div>
                            <div className={cn(
                              "col-span-3 truncate font-medium",
                              event.actionCategory === 'navigation' ? 'text-signal-green' :
                              event.actionCategory === 'interaction' ? 'text-signal-blue' :
                              event.actionCategory === 'error' ? 'text-signal-red' : 'text-[#E6EAF0]'
                            )}>
                              {event.actionType}
                            </div>
                            <div className="col-span-3 text-[#8B93A7] truncate text-right">
                              {event.target || event.actionCategory}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>

          <div className="px-8 pb-8">
             <Footer lastUpdated={metrics?.lastUpdated} />
          </div>
        </div>
      </main>

      {/* --- User Timeline Modal --- */}
      <AnimatePresence>
        {selectedUserId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={handleCloseModal}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-[#171A21] border border-[#232833] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-[#232833] flex items-center justify-between bg-[#171A21]">
                <div>
                  <h2 className="text-xl font-heading font-semibold text-[#E6EAF0]">User Timeline</h2>
                  <p className="text-sm text-[#8B93A7] font-mono mt-1">ID: {selectedUserId}</p>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-[#232833] rounded-lg transition-colors text-[#8B93A7] hover:text-[#E6EAF0]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto bg-[#0F1115]">
                {/* Timeline Visualization Placeholder */}
                <div className="relative pl-8 border-l border-[#232833] space-y-8">
                  {events.filter(e => e.userId === selectedUserId).map((event, i) => (
                    <div key={i} className="relative">
                      <div className={cn(
                        "absolute -left-[37px] w-4 h-4 rounded-full border-2 border-[#0F1115]",
                        event.actionCategory === 'navigation' ? 'bg-signal-green' :
                        event.actionCategory === 'error' ? 'bg-signal-red' : 'bg-signal-blue'
                      )} />
                      <div className="bg-[#171A21] border border-[#232833] p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-[#E6EAF0]">{event.actionType}</span>
                          <span className="text-xs font-mono text-[#8B93A7]">
                            {new Date(event.timestamp || '').toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-[#8B93A7]">
                          Target: <span className="text-[#E6EAF0] font-mono">{event.target}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                  {events.filter(e => e.userId === selectedUserId).length === 0 && (
                    <div className="text-[#8B93A7] italic">No recent events found for this user in the current stream.</div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-Components ---

function MetricCard({ label, value, subtext, color, icon, delay }: MetricCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-[#171A21] border border-[#232833] rounded-lg p-5 relative overflow-hidden group hover:border-[#232833]/80 transition-colors"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-medium text-[#8B93A7]">{label}</span>
        {icon}
      </div>
      <div className={cn("text-3xl font-bold font-mono tracking-tight mb-1", color)}>
        {value}
      </div>
      <div className="text-xs text-[#8B93A7] flex items-center gap-1">
        {subtext}
      </div>
      
      {/* Subtle Glow Effect on Hover - smooth and non-distracting */}
      <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-gradient-to-br from-white/3 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-1500 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient from-white/2 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-30 transition-opacity duration-1500 pointer-events-none blur-xl" />
    </motion.div>
  );
}

function PatternCard({ pattern, onClick, isExpanded, onToggle }: PatternCardProps) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "relative bg-[#0F1115] border rounded-lg overflow-hidden transition-all duration-300 group",
        isExpanded ? "border-signal-purple shadow-lg shadow-signal-purple/10" : "border-[#232833] hover:border-[#232833]/80"
      )}
    >
      {/* Subtle glow effect on hover - very smooth */}
      <div className="absolute -inset-0.5 bg-gradient-to-b from-signal-purple/3 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-50 transition-opacity duration-1500 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient from-signal-purple/2 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-30 transition-opacity duration-1500 pointer-events-none blur-xl" />
      
      <SeverityStrip severity={pattern.severity || 'low'} />
      
      <div className="pl-4 p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                pattern.patternType === 'abandonment' ? 'bg-signal-red/10 text-signal-red' :
                pattern.patternType === 'hesitation' ? 'bg-signal-yellow/10 text-signal-yellow' :
                'bg-signal-purple/10 text-signal-purple'
              )}>
                {pattern.patternType}
              </span>
              <span className="text-xs text-[#8B93A7] font-mono">
                {new Date(pattern.detectionTimestamp || '').toLocaleTimeString()}
              </span>
            </div>
            <h3 className="text-sm font-medium text-[#E6EAF0] mt-1">
              User <span className="font-mono text-signal-blue hover:underline" onClick={(e) => { e.stopPropagation(); onClick(pattern.userId || ''); }}>{pattern.userId}</span> on {pattern.page}
            </h3>
          </div>
          <motion.div 
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="text-[#8B93A7]"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#171A21]/50 border-t border-[#232833]"
          >
            <div className="p-4 pl-5 space-y-4">
              <div className="text-sm text-[#E6EAF0] leading-relaxed">
                <span className="text-[#8B93A7] text-xs uppercase tracking-wider block mb-1">Analysis</span>
                {pattern.explanation || "Pattern detected based on rapid cursor movement and multiple navigation loops within a short timeframe."}
              </div>
              
              <div>
                <span className="text-[#8B93A7] text-xs uppercase tracking-wider block mb-2">Context</span>
                <div className="flex items-center gap-2 text-xs font-mono text-[#8B93A7] bg-[#0F1115] p-2 rounded border border-[#232833]">
                  <Activity className="w-3 h-3" />
                  {pattern.eventContextSummary || "5 events in last 30s"}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onClick(pattern.userId || ''); }}
                  className="text-xs flex items-center gap-1 text-signal-blue hover:text-signal-blue/80 transition-colors"
                >
                  View Full Timeline <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}