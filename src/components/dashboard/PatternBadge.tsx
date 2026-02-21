interface PatternBadgeProps {
  type: string | undefined;
}

export default function PatternBadge({ type }: PatternBadgeProps) {
  const getBadgeStyle = (patternType: string | undefined) => {
    const normalizedType = patternType?.toLowerCase();
    
    switch (normalizedType) {
      case 'hesitation':
        return 'bg-signal-yellow/10 text-signal-yellow border-signal-yellow/20';
      case 'navigation-loop':
      case 'navigation loop':
        return 'bg-signal-blue/10 text-signal-blue border-signal-blue/20';
      case 'abandonment':
        return 'bg-signal-red/10 text-signal-red border-signal-red/20';
      default:
        return 'bg-secondary/10 text-secondary border-secondary/20';
    }
  };

  const formatType = (type: string | undefined) => {
    if (!type) return 'Unknown';
    return type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-paragraph font-medium border ${getBadgeStyle(type)}`}>
      {formatType(type)}
    </span>
  );
}
