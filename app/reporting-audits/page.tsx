"use client";

import { useMemo, useState } from "react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { MetricCard } from "@/components/Dashboard/MetricCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 
import { Download, RefreshCw } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StaffKPIsTable } from "@/components/ReportingAudits/StaffKPIsTable";
import { ResellerKPIsTable } from "@/components/ReportingAudits/ResellerKPIsTable";
import { ActivityLogs } from "@/components/ReportingAudits/ActivityLogs";
import { ReportingOverview } from "@/components/ReportingAudits/ReportingOverview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ReportingAudits = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [rangePreset, setRangePreset] = useState<"today" | "7d" | "30d" | "custom">("today");
  

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
    // custom (no calendar for now) -> treat as today
    if (rangePreset === "custom") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return { start: start.getTime(), end: nowMs };
    }
    // fallback: today
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end: nowMs };
  }, [rangePreset]);

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

  const exportStaffAsCSV = () => {
    if (!staffKPIs || staffKPIs.length === 0) return;
    const headers = [
      "Staff Name",
      "AHT (mins)",
      "Success Rate (%)",
      "Pass/Hold Ratio",
      "Orders Today",
      "Total Orders",
      "Status",
    ];
    const rows = staffKPIs.map((s) => [
      s.staffName,
      String(s.aht),
      String(s.successRate),
      String(s.passHoldRatio),
      String(s.ordersToday),
      String(s.totalOrders),
      s.status,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff-kpis-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportStaffAsPDF = () => {
    if (!staffKPIs || staffKPIs.length === 0) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const style = `
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; }
        h1 { font-size: 18px; margin: 0 0 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        th { background: #f5f5f5; text-align: left; }
      </style>
    `;
    const header = `<h1>Staff KPIs Report (${new Date().toLocaleString()})</h1>`;
    const tableHead = `
      <tr>
        <th>Staff Name</th>
        <th>AHT (mins)</th>
        <th>Success Rate (%)</th>
        <th>Pass/Hold Ratio</th>
        <th>Orders Today</th>
        <th>Total Orders</th>
        <th>Status</th>
      </tr>
    `;
    const tableRows = staffKPIs
      .map((s) => `
        <tr>
          <td>${s.staffName}</td>
          <td>${s.aht}</td>
          <td>${s.successRate}</td>
          <td>${s.passHoldRatio}</td>
          <td>${s.ordersToday}</td>
          <td>${s.totalOrders}</td>
          <td>${s.status}</td>
        </tr>
      `)
      .join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"/>${style}</head><body>${header}<table><thead>${tableHead}</thead><tbody>${tableRows}</tbody></table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const exportResellerAsCSV = () => {
    if (!resellerKPIs || resellerKPIs.length === 0) return;
    const headers = [
      "Team Name",
      "Orders Today",
      "Total Orders",
      "Dispute Rate (%)",
      "Low-Value Orders",
      "Auto-Cancel Rate (%)",
      "Revenue ($)",
    ];
    const rows = resellerKPIs.map((r) => [
      r.teamName,
      String(r.ordersToday),
      String(r.totalOrders),
      String(r.disputeRate),
      String(r.lowValueOrders),
      String(r.autoCancelRate),
      String(r.revenue),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reseller-kpis-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportResellerAsPDF = () => {
    if (!resellerKPIs || resellerKPIs.length === 0) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const style = `
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; }
        h1 { font-size: 18px; margin: 0 0 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        th { background: #f5f5f5; text-align: left; }
      </style>
    `;
    const header = `<h1>Reseller KPIs Report (${new Date().toLocaleString()})</h1>`;
    const head = `
      <tr>
        <th>Team Name</th>
        <th>Orders Today</th>
        <th>Total Orders</th>
        <th>Dispute Rate (%)</th>
        <th>Low-Value Orders</th>
        <th>Auto-Cancel Rate (%)</th>
        <th>Revenue ($)</th>
      </tr>
    `;
    const rows = resellerKPIs.map((r) => `
      <tr>
        <td>${r.teamName}</td>
        <td>${r.ordersToday}</td>
        <td>${r.totalOrders}</td>
        <td>${r.disputeRate}</td>
        <td>${r.lowValueOrders}</td>
        <td>${r.autoCancelRate}</td>
        <td>${r.revenue}</td>
      </tr>
    `).join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"/>${style}</head><body>${header}<table><thead>${head}</thead><tbody>${rows}</tbody></table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
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
            {/* Calendar removed for now */}
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
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
              title="Revenue" 
              value={`$${overview.revenue.toLocaleString()}`}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Staff Report
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportStaffAsPDF}>Export as PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportStaffAsCSV}>Export as Excel (CSV)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <StaffKPIsTable data={staffKPIs} />
          </TabsContent>

          <TabsContent value="reseller" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Reseller Performance</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Reseller Report
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportResellerAsPDF}>Export as PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportResellerAsCSV}>Export as Excel (CSV)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
