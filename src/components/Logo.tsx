import tastestackLogo from "@/assets/tastestack-logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

export default function Logo({ size = "md" }: LogoProps) {
  return (
    <img
      src={tastestackLogo}
      alt="TasteStack"
      className={`${sizeMap[size]} rounded-lg object-contain`}
    />
  );
}
