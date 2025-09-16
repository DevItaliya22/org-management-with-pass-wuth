"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { Loader2 } from "lucide-react";

interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  leftLabel?: string;
  isLoading?: boolean;
  loadingText?: string;
}

export function GradientButton({
  leftLabel,
  children,
  isLoading = false,
  loadingText,
  style,
  ...props
}: GradientButtonProps) {
  const { theme } = useTheme();

  const background =
    theme === "light"
      ? "linear-gradient(135deg, oklch(0.5 0.15 180) 0%, oklch(0.5 0.15 200) 25%, oklch(0.45 0.12 270) 50%, oklch(0.5 0.18 320) 100%)"
      : "linear-gradient(135deg, oklch(0.5 0.25 180) 0%, oklch(0.5 0.25 200) 25%, oklch(0.4 0.2 270) 50%, oklch(0.5 0.3 320) 100%)";

  const color = "#ffffff"; // Always white text for better contrast on gradient

  // Determine what text to show
  const displayText = isLoading ? loadingText || "Loading..." : children;

  return (
    <button
      className="inline-flex items-center justify-center px-4 py-3 rounded-lg w-full border-0 outline-none gap-2"
      style={{ background, color, ...style }}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {leftLabel && <span style={{ color }}>{leftLabel}</span>}
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {displayText}
    </button>
  );
}

export default GradientButton;
