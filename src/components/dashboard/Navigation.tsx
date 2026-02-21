import { LayoutDashboard, Users, AlertTriangle, BarChart3, Settings } from 'lucide-react';

export default function Navigation() {
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: Users, label: 'Users', active: false },
    { icon: AlertTriangle, label: 'Patterns', active: false },
    { icon: BarChart3, label: 'Metrics', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <nav className="fixed left-0 top-[73px] bottom-0 w-16 bg-panel-background border-r border-border z-10">
      <div className="flex flex-col items-center gap-6 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                item.active
                  ? 'bg-background text-foreground'
                  : 'text-secondary hover:text-foreground hover:bg-background/50'
              }`}
              aria-label={item.label}
            >
              {item.active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-signal-blue rounded-r" />
              )}
              <Icon size={20} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
