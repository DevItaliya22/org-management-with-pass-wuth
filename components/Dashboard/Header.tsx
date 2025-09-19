"use client";

import { ChevronDown, Crown, Shield, Users, User } from "lucide-react";
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
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps = {}) {
  const pathname = usePathname();
  const roleState = useRole();
  const myStaff = useQuery(api.staff.getMyStaff, roleState.isLoading ? (undefined as any) : ({} as any));
  const updateMyStatus = useMutation(api.staff.updateMyStatus);

  // Get role information
  const getRoleDisplay = () => {
    if (roleState.isLoading) return { label: "Loading...", icon: User };

    if (roleState.isOwner) return { label: "Owner", icon: Crown };
    if (roleState.isStaff) return { label: "Staff", icon: Shield };
    if (roleState.isResellerAdmin)
      return { label: "Reseller Admin", icon: Users };
    if (roleState.isResellerMember)
      return { label: "Reseller Member", icon: User };
    if (roleState.isResellerDefaultMember)
      return { label: "Reseller User", icon: Users };

    // Fallbacks
    return { label: "User", icon: User };
  };

  const { label, icon: IconComponent } = getRoleDisplay();

  return (
    <header className="flex h-16 items-center justify-between bg-transparent px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-semibold text-foreground"></h1>
      </div>

      <div className="flex items-center space-x-4">
        {roleState.isStaff && (
          <div className="flex items-center gap-1 rounded-full border p-1 overflow-x-auto">
            {(["online", "paused", "offline"] as const).map((s) => (
              <button
                key={s}
                className={cn(
                  "px-3 py-1 text-xs rounded-full transition-colors",
                  myStaff?.status === s
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground",
                )}
                onClick={async () => {
                  if (!myStaff || myStaff.status === s) return;
                  try {
                    await updateMyStatus({ status: s });
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                {s === "online" ? "Online" : s === "paused" ? "Paused" : "Offline"}
              </button>
            ))}
          </div>
        )}
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
            {roleState.isStaff && (
              <>
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={cn(myStaff?.status === "online" && "bg-muted")}
                  onClick={async () => {
                    if (myStaff?.status !== "online") await updateMyStatus({ status: "online" });
                  }}
                >
                  Online
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(myStaff?.status === "paused" && "bg-muted")}
                  onClick={async () => {
                    if (myStaff?.status !== "paused") await updateMyStatus({ status: "paused" });
                  }}
                >
                  Paused / Break
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(myStaff?.status === "offline" && "bg-muted")}
                  onClick={async () => {
                    if (myStaff?.status !== "offline") await updateMyStatus({ status: "offline" });
                  }}
                >
                  Offline
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
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
