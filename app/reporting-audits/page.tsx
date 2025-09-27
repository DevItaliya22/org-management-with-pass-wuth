"use client";

import { useState } from "react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { MetricCard } from "@/components/Dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StaffKPIsTable } from "@/components/ReportingAudits/StaffKPIsTable";
import { ResellerKPIsTable } from "@/components/ReportingAudits/ResellerKPIsTable";
import { ActivityLogs } from "@/components/ReportingAudits/ActivityLogs";
import { ReportingOverview } from "@/components/ReportingAudits/ReportingOverview";

const ReportingAudits = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch reporting data
  const overview = useQuery(api.reportingAudits.getDashboardOverview);
  const staffKPIs = useQuery(api.reportingAudits.getStaffKPIs, {});
  const resellerKPIs = useQuery(api.reportingAudits.getResellerKPIs, {});
  const recentActivity = useQuery(api.reportingAudits.getRecentActivity, {
    limit: 20,
    actionTypes: [
      "order_picked", "order_resumed", "order_passed", "order_hold",
      "fulfil_submitted", "order_created", "order_completed", "order_disputed",
      "order_auto_cancelled", "dispute_resolved"
    ]
  });

  const handleExport = (type: string) => {
    // TODO: Implement CSV/PDF export functionality
    console.log(`Exporting ${type}...`);
  };

  const handleRefresh = () => {
    // Convex queries will automatically refresh
    window.location.reload();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reporting & Audits</h1>
            <p className="text-muted-foreground">Monitor staff performance, reseller KPIs, and system activity</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("all")}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              title="Orders Today" 
              value={overview.totalOrdersToday.toString()}
            />
            <MetricCard 
              title="Active Staff" 
              value={overview.activeStaffCount.toString()}
            />
            <MetricCard 
              title="Pending Disputes" 
              value={overview.pendingDisputes.toString()}
            />
            <MetricCard 
              title="Revenue Today" 
              value={`$${overview.revenueToday.toLocaleString()}`}
            />
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="staff">Staff KPIs</TabsTrigger>
            <TabsTrigger value="reseller">Reseller KPIs</TabsTrigger>
            <TabsTrigger value="activity">Activity Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <ReportingOverview overview={overview} />
          </TabsContent>

          <TabsContent value="staff" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Staff Performance</h2>
              <Button variant="outline" size="sm" onClick={() => handleExport("staff")}>
                <Download className="h-4 w-4 mr-2" />
                Export Staff Report
              </Button>
            </div>
            <StaffKPIsTable data={staffKPIs} />
          </TabsContent>

          <TabsContent value="reseller" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Reseller Performance</h2>
              <Button variant="outline" size="sm" onClick={() => handleExport("reseller")}>
                <Download className="h-4 w-4 mr-2" />
                Export Reseller Report
              </Button>
            </div>
            <ResellerKPIsTable data={resellerKPIs} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Activity Logs</h2>
              <Button variant="outline" size="sm" onClick={() => handleExport("activity")}>
                <Download className="h-4 w-4 mr-2" />
                Export Activity Log
              </Button>
            </div>
            <ActivityLogs data={recentActivity} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ReportingAudits;
