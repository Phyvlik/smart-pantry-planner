interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 28, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bottom layer - plate/base */}
      <rect x="4" y="24" width="24" height="4" rx="2" fill="hsl(var(--primary))" />
      {/* Middle layer */}
      <rect x="6" y="17" width="20" height="4" rx="2" fill="hsl(var(--secondary))" />
      {/* Top layer */}
      <rect x="8" y="10" width="16" height="4" rx="2" fill="hsl(var(--primary))" opacity="0.7" />
      {/* Steam wisps */}
      <path d="M13 8C13 6 14.5 5 14.5 3" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M18 8C18 6 19.5 5 19.5 3" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
