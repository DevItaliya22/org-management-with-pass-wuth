"use client";

import {
  Bell,
  ChevronDown,
  Crown,
  Briefcase,
  Shield,
  Users,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps = {}) {
  const pathname = usePathname();
  const sessionData = useQuery(api.session.getCurrentUserSession);

  // Get role information
  const getRoleDisplay = () => {
    if (!sessionData) return { role: "Loading...", icon: User };

    const { user, resellerMember } = sessionData;
    const userRole = user.role;

    if (userRole === "owner") {
      return { role: "Owner", icon: Crown };
    } else if (userRole === "staff") {
      return { role: "Staff", icon: Shield };
    } else if (userRole === "reseller") {
      if (resellerMember?.role === "admin") {
        return { role: "Reseller Admin", icon: Users };
      } else {
        return { role: "Reseller Member", icon: User };
      }
    }
    return { role: "User", icon: User };
  };

  const { role, icon: IconComponent } = getRoleDisplay();

  return (
    <header className="flex h-16 items-center justify-between bg-transparent px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-semibold text-foreground"></h1>
      </div>

      <div className="flex items-center space-x-4">
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className={
              pathname === "/"
                ? "text-sm font-medium text-foreground"
                : "text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth"
            }
          >
            Dashboard
          </Link>
          <Link
            href="/reports"
            className={
              pathname === "/reports"
                ? "text-sm font-medium text-foreground"
                : "text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth"
            }
          >
            Reports
          </Link>
        </nav>

        <ThemeToggle />

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full"></span>
        </Button>

        <Button variant="ghost" className="flex items-center space-x-2">
          <IconComponent className="h-4 w-4" />
          <span className="text-sm font-medium">{role}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
