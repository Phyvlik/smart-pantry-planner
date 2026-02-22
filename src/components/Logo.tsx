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
      {/* Leaf background */}
      <path
        d="M6 26C6 26 4 14 16 6C28 14 26 26 26 26C26 26 22 20 16 18C10 20 6 26 6 26Z"
        fill="hsl(var(--primary))"
        opacity="0.15"
      />
      <path
        d="M6 26C6 26 4 14 16 6C28 14 26 26 26 26"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      {/* Leaf vein */}
      <path
        d="M16 6V26"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
        opacity="0.2"
        strokeLinecap="round"
      />
      {/* Fork */}
      <line x1="16" y1="28" x2="16" y2="14" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="8" x2="12" y2="14" stroke="hsl(var(--foreground))" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="8" x2="16" y2="14" stroke="hsl(var(--foreground))" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="20" y1="8" x2="20" y2="14" stroke="hsl(var(--foreground))" strokeWidth="1.8" strokeLinecap="round" />
      {/* Fork bridge */}
      <path d="M12 14Q16 16 20 14" stroke="hsl(var(--foreground))" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}
