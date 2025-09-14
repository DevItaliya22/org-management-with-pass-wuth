"use client";

import { Home, Package, FileText, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", icon: Home, href: "/" },
  { name: "Ops", icon: Package, href: "/ops" },
  { name: "Reports", icon: FileText, href: "/reports" },
  { name: "Receivables", icon: Settings, href: "/receivables" },
];

export function MobileNavigation() {
  const pathname = usePathname();
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="grid grid-cols-4 py-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 transition-smooth",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}