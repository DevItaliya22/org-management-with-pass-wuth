"use client";

import { cn } from "@/lib/utils";
import { BarChart3, Package, FileText, Settings, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: "Dashboard", icon: Home, href: "/" },
  { name: "Staff Live Ops", icon: Package, href: "/ops" },
  { name: "Receivables", icon: Settings, href: "/receivables" },
  { name: "Disputes Center", icon: FileText, href: "/disputes" },
  { name: "Reporting & Audits", icon: BarChart3, href: "/reports" },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  return (
    <div className={cn("hidden md:flex h-full w-64 flex-col bg-transparent", className)}>
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-lg font-semibold text-foreground">Cute Services</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-smooth",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}