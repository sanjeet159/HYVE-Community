interface Props { className?: string; showText?: boolean }
export const HyveLogo = ({ className = "", showText = true }: Props) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
      <path
        d="M16 2 L29 9.5 V22.5 L16 30 L3 22.5 V9.5 Z"
        fill="hsl(var(--primary))"
        stroke="hsl(var(--foreground))"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11 11 V21 M11 16 H21 M21 11 V21"
        stroke="hsl(var(--foreground))"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
    {showText && (
      <span className="font-display text-xl font-bold tracking-tight">Hyve</span>
    )}
  </div>
);
