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
import { useRole } from "@/hooks/use-role";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton } from "@/components/SignOutButton";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps = {}) {
  const pathname = usePathname();
  const roleState = useRole();

  // Get role information
  const getRoleDisplay = () => {
    if (roleState.isLoading) return { label: "Loading...", icon: User };

    if (roleState.isOwner) return { label: "Owner", icon: Crown };
    if (roleState.isStaff) return { label: "Staff", icon: Shield };
    if (roleState.isResellerAdmin)
      return { label: "Reseller Admin", icon: Users };
    if (roleState.isResellerMember)
      return { label: "Reseller Member", icon: User };

    // Fallbacks
    if (roleState.isReseller) return { label: "Reseller", icon: Users };
    return { label: "User", icon: User };
  };

  const { label, icon: IconComponent } = getRoleDisplay();

  return (
    <header className="flex h-16 items-center justify-between bg-transparent px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-semibold text-foreground"></h1>
      </div>

      <div className="flex items-center space-x-4">
        <ThemeToggle />
        {/* 
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full"></span>
        </Button> */}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <IconComponent className="h-4 w-4" />
              <span className="text-sm font-medium">{label}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={
                  roleState.session?.user
                    ? `/teams/user/${roleState.session.user._id}`
                    : "#"
                }
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <SignOutButton />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
