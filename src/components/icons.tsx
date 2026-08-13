// Jeu d'icônes SVG (stroke, viewBox 24). Pas d'emoji dans l'UI.
interface IconProps {
  className?: string;
  size?: number;
}

function base(size = 24, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };
}

export function AlbumIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function TradeIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M7 8h13" />
      <path d="m17 5 3 3-3 3" />
      <path d="M17 16H4" />
      <path d="m7 19-3-3 3-3" />
    </svg>
  );
}

export function ListIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function GridIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}

export function PlusIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MinusIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function HistoryIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 3v5h5" />
      <path d="M3.05 13a9 9 0 1 0 2.5-6.36L3 8" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function CheckIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function SpadeIcon({ className, size }: IconProps) {
  return (
    <svg width={size ?? 24} height={size ?? 24} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2c-.4 0-.8.15-1.1.44C8.9 4.2 4 8.3 4 12.5A4.5 4.5 0 0 0 8.5 17c.9 0 1.7-.26 2.4-.72-.1 1.4-.7 2.6-1.9 3.72-.3.3-.1.8.3.8h5.4c.4 0 .6-.5.3-.8-1.2-1.12-1.8-2.32-1.9-3.72.7.46 1.5.72 2.4.72A4.5 4.5 0 0 0 20 12.5c0-4.2-4.9-8.3-6.9-10.06A1.6 1.6 0 0 0 12 2Z" />
    </svg>
  );
}
