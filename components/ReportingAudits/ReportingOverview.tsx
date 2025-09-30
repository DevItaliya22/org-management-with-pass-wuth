"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChartContainer, 
  ChartLegend, 
  ChartLegendContent, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface OverviewDashboardProps {
  overview: {
    totalOrdersToday: number;
    activeStaffCount: number;
    pendingDisputes: number;
    revenue: number;
    disputeRate: number;
    ordersCompleted: number;
    disputesResolved: number;
    ordersByStatus: {
      submitted: number;
      picked: number;
      inProgress: number;
      onHold: number;
      fulfilSubmitted: number;
      completed: number;
      disputed: number;
      cancelled: number;
    };
  } | undefined;
}

export const ReportingOverview = ({ overview }: OverviewDashboardProps) => {
  if (!overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading overview data...</div>
      </div>
    );
  }

  // Prepare data for charts
  const ordersByStatusData = [
    { name: "Submitted", value: overview.ordersByStatus.submitted, color: "#3b82f6" },
    { name: "Picked", value: overview.ordersByStatus.picked, color: "#10b981" },
    { name: "In Progress", value: overview.ordersByStatus.inProgress, color: "#f59e0b" },
    { name: "On Hold", value: overview.ordersByStatus.onHold, color: "#ef4444" },
    { name: "Fulfil Submitted", value: overview.ordersByStatus.fulfilSubmitted, color: "#8b5cf6" },
    { name: "Completed", value: overview.ordersByStatus.completed, color: "#06b6d4" },
    { name: "Disputed", value: overview.ordersByStatus.disputed, color: "#f97316" },
    { name: "Cancelled", value: overview.ordersByStatus.cancelled, color: "#6b7280" },
  ].filter(item => item.value > 0);

  const statusIcons = {
    submitted: <Clock className="h-4 w-4" />,
    picked: <TrendingUp className="h-4 w-4" />,
    inProgress: <TrendingUp className="h-4 w-4" />,
    onHold: <AlertCircle className="h-4 w-4" />,
    fulfilSubmitted: <CheckCircle className="h-4 w-4" />,
    completed: <CheckCircle className="h-4 w-4" />,
    disputed: <AlertCircle className="h-4 w-4" />,
    cancelled: <XCircle className="h-4 w-4" />,
  };

  const getStatusColor = (status: string) => {
    const colors = {
      submitted: "bg-blue-100 text-blue-800",
      picked: "bg-green-100 text-green-800",
      inProgress: "bg-yellow-100 text-yellow-800",
      onHold: "bg-red-100 text-red-800",
      fulfilSubmitted: "bg-purple-100 text-purple-800",
      completed: "bg-cyan-100 text-cyan-800",
      disputed: "bg-orange-100 text-orange-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const totalOrders = Object.values(overview.ordersByStatus).reduce((sum, count) => sum + count, 0);
  const completionRate = overview.totalOrdersToday > 0 ? (overview.ordersCompleted / overview.totalOrdersToday) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
              <Progress value={completionRate} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {overview.ordersCompleted} orders completed (reseller satisfaction)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Dispute Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {overview.disputeRate.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">
                Based on audit logs - disputes raised today
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Disputes Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{overview.disputesResolved}</div>
              <p className="text-sm text-muted-foreground">
                Disputes resolved by owner today
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Queue Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{overview.ordersByStatus.submitted + overview.ordersByStatus.picked}</div>
              <p className="text-sm text-muted-foreground">
                {overview.ordersByStatus.submitted} submitted, {overview.ordersByStatus.picked} picked
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ChartContainer
                config={{
                  submitted: { label: "Submitted", color: "#3b82f6" },
                  picked: { label: "Picked", color: "#10b981" },
                  inProgress: { label: "In Progress", color: "#f59e0b" },
                  onHold: { label: "On Hold", color: "#ef4444" },
                  fulfilSubmitted: { label: "Fulfil Submitted", color: "#8b5cf6" },
                  completed: { label: "Completed", color: "#06b6d4" },
                  disputed: { label: "Disputed", color: "#f97316" },
                  cancelled: { label: "Cancelled", color: "#6b7280" },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ordersByStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                    >
                      {ordersByStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            
            {/* Color Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {[
                { name: "Submitted", value: overview.ordersByStatus.submitted, color: "#3b82f6" },
                { name: "Picked", value: overview.ordersByStatus.picked, color: "#10b981" },
                { name: "In Progress", value: overview.ordersByStatus.inProgress, color: "#f59e0b" },
                { name: "On Hold", value: overview.ordersByStatus.onHold, color: "#ef4444" },
                { name: "Fulfil Submitted", value: overview.ordersByStatus.fulfilSubmitted, color: "#8b5cf6" },
                { name: "Completed", value: overview.ordersByStatus.completed, color: "#06b6d4" },
                { name: "Disputed", value: overview.ordersByStatus.disputed, color: "#f97316" },
                { name: "Cancelled", value: overview.ordersByStatus.cancelled, color: "#6b7280" },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(overview.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcons[status as keyof typeof statusIcons]}
                    <span className="capitalize">{status.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(status)}>
                      {count}
                    </Badge>
                    {totalOrders > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {((count / totalOrders) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

