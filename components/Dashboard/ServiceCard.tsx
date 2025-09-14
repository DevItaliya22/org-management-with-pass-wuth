"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ServiceCardProps {
  name: string;
  icon: LucideIcon;
  category: string;
  time?: string;
  action?: string;
  variant?: "chipotle" | "movies" | "flights" | "others";
  className?: string;
}

export function ServiceCard({ 
  name, 
  icon: Icon, 
  category, 
  time, 
  action = "Pick",
  variant = "others",
  className 
}: ServiceCardProps) {
  const { theme } = useTheme();
  
  const serviceStyles = {
    chipotle: "service-gradient",
    movies: "service-gradient", 
    flights: "service-gradient",
    others: "service-gradient"
  };

  const actionStyles = {
    chipotle: "action-gradient",
    movies: "action-gradient", 
    flights: "action-gradient",
    others: "action-gradient"
  };

  // Theme-aware colors
  const cardBackground = theme === 'light' ? 'bg-card' : 'bg-slate-900';
  const cardBorder = theme === 'light' ? 'border-border' : 'border-slate-800';
  const textColor = theme === 'light' ? 'text-foreground' : 'text-white';
  const categoryTextColor = theme === 'light' ? 'text-muted-foreground' : 'text-white';
  const iconColor = theme === 'light' ? 'text-foreground' : 'text-white';
  
  // Theme-aware button gradient
  const buttonGradient = theme === 'light' 
    ? 'linear-gradient(135deg, oklch(0.5 0.15 180) 0%, oklch(0.5 0.15 200) 25%, oklch(0.45 0.12 270) 50%, oklch(0.5 0.18 320) 100%)'
    : 'linear-gradient(135deg, oklch(0.5 0.25 180) 0%, oklch(0.5 0.25 200) 25%, oklch(0.4 0.2 270) 50%, oklch(0.5 0.3 320) 100%)';
  
  const buttonTextColor = theme === 'light' ? '#1a1a1a' : '#ffffff';

  return (
    <Card className={cn(`${cardBackground} ${cardBorder} transition-smooth hover:shadow-lg`, className)}>
      <CardContent className="p-5 min-h-[152px]">
        {/* Top Section */}
        <div className="mb-5">
          <h3 className={`${textColor} text-lg font-semibold mb-1`}>{name}</h3>
          <div className="flex items-center space-x-2">
            <div className={cn("p-1 rounded", serviceStyles[variant])}>
              <Icon className={`h-4 w-4 ${iconColor} drop-shadow-sm`} />
            </div>
            <span className={`${categoryTextColor} text-sm`}>{category}</span>
          </div>
        </div>
        
         {/* Bottom Action Button */}
         <button 
           className="flex items-center justify-between px-4 py-3 rounded-lg w-full text-left border-0 outline-none"
           style={{
             background: buttonGradient,
             color: buttonTextColor
           }}
         >
           {time && (
             <span className="text-sm font-bold" style={{color: buttonTextColor}}>{time}</span>
           )}
           <span className="text-sm font-bold" style={{color: buttonTextColor}}>{action}</span>
         </button>
      </CardContent>
    </Card>
  );
}