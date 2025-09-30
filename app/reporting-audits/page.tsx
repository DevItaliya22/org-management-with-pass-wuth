"use client";

import { useMemo, useState } from "react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { MetricCard } from "@/components/Dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Download, RefreshCw } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StaffKPIsTable } from "@/components/ReportingAudits/StaffKPIsTable";
import { ResellerKPIsTable } from "@/components/ReportingAudits/ResellerKPIsTable";
import { ActivityLogs } from "@/components/ReportingAudits/ActivityLogs";
import { ReportingOverview } from "@/components/ReportingAudits/ReportingOverview";

const ReportingAudits = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [rangePreset, setRangePreset] = useState<"today" | "7d" | "30d" | "custom">("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  const dateRange = useMemo(() => {
    const now = new Date();
    const nowMs = now.getTime();
    if (rangePreset === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return { start: start.getTime(), end: nowMs };
    }
    if (rangePreset === "7d") {
      return { start: nowMs - 7 * 24 * 60 * 60 * 1000, end: nowMs };
    }
    if (rangePreset === "30d") {
      return { start: nowMs - 30 * 24 * 60 * 60 * 1000, end: nowMs };
    }
    // custom
    const from = customRange?.from;
    const to = customRange?.to;
    if (from && to) {
      const start = new Date(from);
      start.setHours(0, 0, 0, 0);
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      return { start: start.getTime(), end: end.getTime() };
    }
    // fallback: today
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end: nowMs };
  }, [rangePreset, customRange]);

  // Fetch reporting data (all scoped by selected dateRange)
  const overview = useQuery(api.reportingAudits.getDashboardOverview, { dateRange });
  const staffKPIs = useQuery(api.reportingAudits.getStaffKPIs, { dateRange });
  const resellerKPIs = useQuery(api.reportingAudits.getResellerKPIs, { dateRange });
  const recentActivity = useQuery(api.reportingAudits.getRecentActivity, {
    limit: 20,
    actionTypes: [
      "order_picked", "order_resumed", "order_passed", "order_hold",
      "fulfil_submitted", "order_created", "order_completed", "order_disputed",
      "order_auto_cancelled", "dispute_resolved"
    ],
    dateRange,
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
            <Select value={rangePreset} onValueChange={(v) => setRangePreset(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="custom">Date range</SelectItem>
              </SelectContent>
            </Select>
            {rangePreset === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    {customRange?.from && customRange?.to
                      ? `${customRange.from.toLocaleDateString()} - ${customRange.to.toLocaleDateString()}`
                      : "Select dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={(range: DateRange | undefined) =>
                      setCustomRange(range)
                    }
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}
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
