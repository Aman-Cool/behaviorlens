import { create } from 'zustand';

// Cast to a loose env map so PUBLIC_BACKEND_URL is accessible without extending
// ImportMetaEnv — import.meta.env is an opaque record at runtime.
const _env = import.meta.env as Record<string, string | undefined>;
const BACKEND_URL = _env.PUBLIC_BACKEND_URL ?? 'http://localhost:8080';

// --------------------------------------------------------------------------
// Types — mirror the Go schema definitions exactly
// --------------------------------------------------------------------------

export interface Pattern {
  pattern_id: string;
  user_id: string;
  type: 'hesitation' | 'navigation-loop' | 'abandonment';
  page: string;
  detected_at: number; // unix epoch ms
  explanation: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
}

export interface SystemMetrics {
  total_events: number;
  active_users: number;
  patterns_detected: number;
  abandonment_rate: number;
  as_of: number; // unix epoch ms
}

export interface ActiveUser {
  user_id: string;
  current_page: string;
  last_seen: number; // unix epoch ms
  has_active_pattern: boolean;
}

export interface EventFeedItem {
  id: string;
  user_id: string;
  action: string; // click | scroll | idle | navigate | abandon
  page: string;
  timestamp: number; // unix epoch ms
  metadata?: Record<string, string>;
}

// --------------------------------------------------------------------------
// Store shape
// --------------------------------------------------------------------------

interface BehaviorLensState {
  patterns: Pattern[];
  metrics: SystemMetrics | null;
  activeUsers: ActiveUser[];
  eventFeed: EventFeedItem[];
  isConnected: boolean;
  lastUpdated: number | null;
  fetchAll: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

// Module-level interval handle so it survives re-renders.
let pollingInterval: ReturnType<typeof setInterval> | null = null;

// --------------------------------------------------------------------------
// Store
// --------------------------------------------------------------------------

export const useBehaviorLensStore = create<BehaviorLensState>((set, get) => ({
  patterns: [],
  metrics: null,
  activeUsers: [],
  eventFeed: [],
  isConnected: false,
  lastUpdated: null,

  fetchAll: async () => {
    try {
      const [patternsRes, metricsRes, usersRes, eventsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/patterns?limit=50`),
        fetch(`${BACKEND_URL}/api/metrics`),
        fetch(`${BACKEND_URL}/api/users`),
        fetch(`${BACKEND_URL}/api/events?limit=50`),
      ]);

      if (!patternsRes.ok || !metricsRes.ok || !usersRes.ok || !eventsRes.ok) {
        set({ isConnected: false });
        return;
      }

      const [patterns, metrics, activeUsers, eventFeed] = await Promise.all([
        patternsRes.json() as Promise<Pattern[]>,
        metricsRes.json() as Promise<SystemMetrics>,
        usersRes.json() as Promise<ActiveUser[]>,
        eventsRes.json() as Promise<EventFeedItem[]>,
      ]);

      set({
        patterns: patterns ?? [],
        metrics: metrics ?? null,
        activeUsers: activeUsers ?? [],
        eventFeed: eventFeed ?? [],
        isConnected: true,
        lastUpdated: Date.now(),
      });
    } catch {
      set({ isConnected: false });
    }
  },

  startPolling: () => {
    // Fetch immediately, then every 2 seconds.
    get().fetchAll();
    if (pollingInterval !== null) {
      clearInterval(pollingInterval);
    }
    pollingInterval = setInterval(() => {
      get().fetchAll();
    }, 2000);
  },

  stopPolling: () => {
    if (pollingInterval !== null) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  },
}));
