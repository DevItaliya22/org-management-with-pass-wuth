"use client";

import { useTheme } from "@/contexts/ThemeContext";

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  leftLabel?: string;
}

export function GradientButton({ leftLabel, children, style, ...props }: GradientButtonProps) {
  const { theme } = useTheme();

  const background = theme === "light"
    ? "linear-gradient(135deg, oklch(0.5 0.15 180) 0%, oklch(0.5 0.15 200) 25%, oklch(0.45 0.12 270) 50%, oklch(0.5 0.18 320) 100%)"
    : "linear-gradient(135deg, oklch(0.5 0.25 180) 0%, oklch(0.5 0.25 200) 25%, oklch(0.4 0.2 270) 50%, oklch(0.5 0.3 320) 100%)";

  const color = theme === "light" ? "#1a1a1a" : "#ffffff";

  return (
    <button
      className="inline-flex items-center justify-center px-4 py-3 rounded-lg w-full border-0 outline-none"
      style={{ background, color, ...style }}
      {...props}
    >
      {leftLabel && <span style={{ color }}>{leftLabel}</span>}
      <span style={{ color }}>{children}</span>
    </button>
  );
}

export default GradientButton;


