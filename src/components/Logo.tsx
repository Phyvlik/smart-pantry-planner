import tastestackLogo from "@/assets/tastestack-logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-7 h-7",
  md: "w-8 h-8",
  lg: "w-10 h-10",
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
