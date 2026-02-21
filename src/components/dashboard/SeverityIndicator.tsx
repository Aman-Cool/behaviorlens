interface SeverityIndicatorProps {
  severity: string | undefined;
}

export default function SeverityIndicator({ severity }: SeverityIndicatorProps) {
  const getSeverityColor = (sev: string | undefined) => {
    switch (sev?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-signal-red';
      case 'medium':
        return 'bg-signal-yellow';
      case 'low':
        return 'bg-signal-green';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <div className={`absolute left-0 top-0 bottom-0 w-1 ${getSeverityColor(severity)}`} />
  );
}
