"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  DollarSign,
  Users,
  MoreHorizontal,
  Building2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ResellerKPIData {
  teamId: string;
  teamName: string;
  ordersToday: number;
  totalOrders: number;
  disputeRate: number; // Dispute percentage
  lowValueOrders: number; // Orders below $44
  autoCancelRate: number; // Auto-cancel percentage
  revenueToday: number;
}

interface ResellerKPIsTableProps {
  data: ResellerKPIData[] | undefined;
}

export const ResellerKPIsTable = ({ data }: ResellerKPIsTableProps) => {
  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading reseller KPIs...</div>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceColor = (value: number, type: string) => {
    if (type === "disputeRate") {
      if (value <= 5) return "text-green-600";
      if (value <= 10) return "text-yellow-600";
      return "text-red-600";
    }
    if (type === "autoCancelRate") {
      if (value <= 5) return "text-green-600";
      if (value <= 10) return "text-yellow-600";
      return "text-red-600";
    }
    if (type === "revenue") {
      if (value >= 1000) return "text-green-600";
      if (value >= 500) return "text-yellow-600";
      return "text-red-600";
    }
    return "text-gray-600";
  };

  const getPerformanceIcon = (value: number, type: string) => {
    if (type === "disputeRate") {
      return value <= 8 ? <TrendingDown className="h-4 w-4 text-green-600" /> : <TrendingUp className="h-4 w-4 text-red-600" />;
    }
    if (type === "autoCancelRate") {
      return value <= 8 ? <TrendingDown className="h-4 w-4 text-green-600" /> : <TrendingUp className="h-4 w-4 text-red-600" />;
    }
    if (type === "revenue") {
      return value >= 800 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  // Sort by revenue (descending)
  const sortedData = [...data].sort((a, b) => b.revenueToday - a.revenueToday);

  // Calculate alerts
  const highDisputeTeams = sortedData.filter(team => team.disputeRate > 10);
  const highLowValueTeams = sortedData.filter(team => team.lowValueOrders > 5);
  const highAutoCancelTeams = sortedData.filter(team => team.autoCancelRate > 10);

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {(highDisputeTeams.length > 0 || highLowValueTeams.length > 0 || highAutoCancelTeams.length > 0) && (
        <div className="space-y-2">
          {highDisputeTeams.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {highDisputeTeams.length} team(s) have high dispute rates (&gt;10%): {highDisputeTeams.map(t => t.teamName).join(", ")}
              </AlertDescription>
            </Alert>
          )}
          {highLowValueTeams.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {highLowValueTeams.length} team(s) have many low-value orders (&gt;5): {highLowValueTeams.map(t => t.teamName).join(", ")}
              </AlertDescription>
            </Alert>
          )}
          {highAutoCancelTeams.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {highAutoCancelTeams.length} team(s) have high auto-cancel rates (&gt;10%): {highAutoCancelTeams.map(t => t.teamName).join(", ")}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Reseller Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-center">Orders Today</TableHead>
                  <TableHead className="text-center">Total Orders</TableHead>
                  <TableHead className="text-center">Dispute Rate</TableHead>
                  <TableHead className="text-center">Low-Value Orders</TableHead>
                  <TableHead className="text-center">Auto-Cancel Rate</TableHead>
                  <TableHead className="text-center">Revenue Today</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((team) => (
                  <TableRow key={team.teamId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4" />
                        </div>
                        {team.teamName}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-medium">
                        {team.ordersToday}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <span className="font-medium">{team.totalOrders}</span>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className={`flex items-center justify-center gap-1 ${getPerformanceColor(team.disputeRate, "disputeRate")}`}>
                        {getPerformanceIcon(team.disputeRate, "disputeRate")}
                        <span className="font-medium">{team.disputeRate}%</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {team.lowValueOrders > 5 ? (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-600" />
                        )}
                        <span className={`font-medium ${team.lowValueOrders > 5 ? "text-red-600" : "text-green-600"}`}>
                          {team.lowValueOrders}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className={`flex items-center justify-center gap-1 ${getPerformanceColor(team.autoCancelRate, "autoCancelRate")}`}>
                        {getPerformanceIcon(team.autoCancelRate, "autoCancelRate")}
                        <span className="font-medium">{team.autoCancelRate}%</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className={`flex items-center justify-center gap-1 ${getPerformanceColor(team.revenueToday, "revenue")}`}>
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">${team.revenueToday.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Team Details</DropdownMenuItem>
                          <DropdownMenuItem>Performance Report</DropdownMenuItem>
                          <DropdownMenuItem>Contact Team</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {sortedData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No reseller data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
