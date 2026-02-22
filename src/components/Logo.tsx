import logoImg from "@/assets/tastestack-logo.jpg";

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 28, className = "" }: LogoProps) {
  return (
    <img
      src={logoImg}
      alt="TasteStack logo"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
