"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Clock, 
  CheckCircle, 
  AlertCircle,
  MoreHorizontal,
  User
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StaffKPIData {
  staffId: string;
  staffName: string;
  aht: number; // Average Handle Time in minutes
  successRate: number; // Success percentage
  passHoldRatio: number; // Pass to Hold ratio
  ordersToday: number;
  totalOrders: number;
  status: "online" | "paused" | "offline";
}

interface StaffKPIsTableProps {
  data: StaffKPIData[] | undefined;
}

export const StaffKPIsTable = ({ data }: StaffKPIsTableProps) => {
  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading staff KPIs...</div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "offline":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "paused":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "offline":
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPerformanceColor = (value: number, type: string) => {
    if (type === "aht") {
      if (value <= 30) return "text-green-600";
      if (value <= 60) return "text-yellow-600";
      return "text-red-600";
    }
    if (type === "successRate") {
      if (value >= 90) return "text-green-600";
      if (value >= 70) return "text-yellow-600";
      return "text-red-600";
    }
    if (type === "passHoldRatio") {
      if (value >= 2) return "text-green-600";
      if (value >= 1) return "text-yellow-600";
      return "text-red-600";
    }
    return "text-gray-600";
  };

  const getPerformanceIcon = (value: number, type: string) => {
    if (type === "aht") {
      return value <= 45 ? <TrendingDown className="h-4 w-4 text-green-600" /> : <TrendingUp className="h-4 w-4 text-red-600" />;
    }
    if (type === "successRate") {
      return value >= 80 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    if (type === "passHoldRatio") {
      return value >= 1.5 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  // Sort by performance (success rate + orders today)
  const sortedData = [...data].sort((a, b) => {
    const aScore = a.successRate + (a.ordersToday * 2);
    const bScore = b.successRate + (b.ordersToday * 2);
    return bScore - aScore;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Staff Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">AHT (mins)</TableHead>
                <TableHead className="text-center">Success Rate</TableHead>
                <TableHead className="text-center">Pass/Hold Ratio</TableHead>
                <TableHead className="text-center">Orders Today</TableHead>
                <TableHead className="text-center">Total Orders</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((staff) => (
                <TableRow key={staff.staffId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      {staff.staffName}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Badge className={getStatusColor(staff.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(staff.status)}
                        <span className="capitalize">{staff.status}</span>
                      </div>
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <div className={`flex items-center justify-center gap-1 ${getPerformanceColor(staff.aht, "aht")}`}>
                      {getPerformanceIcon(staff.aht, "aht")}
                      <span className="font-medium">{staff.aht}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <div className={`flex items-center justify-center gap-1 ${getPerformanceColor(staff.successRate, "successRate")}`}>
                        {getPerformanceIcon(staff.successRate, "successRate")}
                        <span className="font-medium">{staff.successRate}%</span>
                      </div>
                      <Progress value={staff.successRate} className="h-1 w-16 mx-auto" />
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <div className={`flex items-center justify-center gap-1 ${getPerformanceColor(staff.passHoldRatio, "passHoldRatio")}`}>
                      {getPerformanceIcon(staff.passHoldRatio, "passHoldRatio")}
                      <span className="font-medium">{staff.passHoldRatio.toFixed(1)}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-medium">
                      {staff.ordersToday}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <span className="font-medium">{staff.totalOrders}</span>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Performance Report</DropdownMenuItem>
                        <DropdownMenuItem>Send Message</DropdownMenuItem>
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
            No staff data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};
