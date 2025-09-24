"use client";

import { cn } from "@/lib/utils";
import { Home, UserPlus2, Users, ShieldCheck, Plus, Tags } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useRole } from "@/hooks/use-role";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { isLoading, isOwner, isStaff, isResellerAdmin, isResellerMember ,isResellerDefaultMember, session } =
    useRole();

  const canCreateOrder = (session?.resellerMember as any)?.canCreateOrder === true;

  const items: Array<{ name: string; href: string; icon: any }> = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
  ];

  if (!isLoading && isOwner) {
    items.push({
      name: "Promotion List",
      href: "/promotion/list",
      icon: ShieldCheck,
    });
    items.push({
      name: "Staff Management",
      href: "/staff/management",
      icon: UserPlus2,
    });
    items.push({
      name: "Categories",
      href: "/categories",
      icon: Tags,
    });
    items.push({
      name: "Orders",
      href: "/orders",
      icon: Users,
    });
    items.push({
      name: "Disputes",
      href: "/owner/disputes",
      icon: ShieldCheck,
    });
  } else if (!isLoading && isStaff) {
    // Dashboard only
    items.push({
      name: "Queue",
      href: "/staff/queue",
      icon: Users,
    });
    items.push({
      name: "My Orders",
      href: "/orders",
      icon: Users,
    });
  } else {
    if (!isLoading && isResellerAdmin) {
      items.push({ name: "Team Management", href: "/team/management", icon: Users });
      items.push({
        name: "Team Invitations",
        href: "/team/invitations",
        icon: Users,
      });
      items.push({
        name: "Orders",
        href: "/orders",
        icon: Users,
      });
      if (canCreateOrder) {
        items.push({
          name: "Create Order",
          href: "/orders/new",
          icon: Plus,
        });
      }
    } else if (!isLoading && isResellerMember) {
      // items.push({ name: "Promotion", href: "/promotion", icon: ShieldCheck });
      items.push({
        name: "Team Requests",
        href: "/team/requests",
        icon: Users,
      });
      items.push({
        name: "Orders",
        href: "/orders",
        icon: Users,
      });
      if (canCreateOrder) {
        items.push({
          name: "Create Order",
          href: "/orders/new",
          icon: Plus,
        });
      }
    } else if (!isLoading && isResellerDefaultMember) {
 
      items.push({
        name: "Team Requests",
        href: "/team/requests",
        icon: Users,
      });
      items.push({
        name: "Orders",
        href: "/orders",
        icon: Users,
      });
      if (canCreateOrder) {
        items.push({
          name: "Create Order",
          href: "/orders/new",
          icon: Plus,
        });
      }
       items.push({
        name: "Promotion",
        href: "/promotion/request",
        icon: ShieldCheck,
      });
    }
  }

  return (
    <div
      className={cn(
        "hidden md:flex h-full w-64 flex-col bg-transparent",
        className,
      )}
    >
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-lg font-semibold text-foreground">
            Cute Services
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-smooth",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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
