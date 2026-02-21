export default function Header() {
  return (
    <header className="bg-panel-background border-b border-border">
      <div className="max-w-[1920px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-signal-purple rounded-lg flex items-center justify-center">
            <span className="text-sm font-heading font-bold text-primary-foreground">BL</span>
          </div>
          <h1 className="text-xl font-heading font-semibold text-foreground">BehaviorLens</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
            <div className="w-2 h-2 bg-signal-green rounded-full animate-pulse" />
            <span className="text-xs text-secondary font-paragraph">Live</span>
          </div>
        </div>
      </div>
    </header>
  );
}
