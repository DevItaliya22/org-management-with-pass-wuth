"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/Dashboard/Sidebar";
import { Header } from "@/components/Dashboard/Header";
import { MobileNavigation } from "@/components/Dashboard/MobileNavigation";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex h-screen">
      {!isMobile && <Sidebar />}
      <div className="flex flex-1 flex-col overflow-hidden relative isolate">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6 space-y-6">{children}</main>
      </div>
      <MobileNavigation />
    </div>
  );
};

export default DashboardLayout;


