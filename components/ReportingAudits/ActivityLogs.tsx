"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Clock, 
  User, 
  Building2, 
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Pause
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface ActivityLogData {
  _id: string;
  actorUserId: string;
  actorName: string;
  orderId?: string;
  teamId?: string;
  teamName?: string;
  actionType: string;
  metrics?: any;
  createdAt: number;
}

interface ActivityLogsProps {
  data: ActivityLogData[] | undefined;
}

export const ActivityLogs = ({ data }: ActivityLogsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading activity logs...</div>
        </CardContent>
      </Card>
    );
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "order_picked":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "order_resumed":
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case "order_passed":
        return <TrendingDown className="h-4 w-4 text-yellow-600" />;
      case "order_hold":
        return <Pause className="h-4 w-4 text-orange-600" />;
      case "fulfil_submitted":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "order_created":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "order_completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "order_disputed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "order_auto_cancelled":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case "dispute_resolved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case "order_picked":
        return "bg-green-100 text-green-800";
      case "order_resumed":
        return "bg-blue-100 text-blue-800";
      case "order_passed":
        return "bg-yellow-100 text-yellow-800";
      case "order_hold":
        return "bg-orange-100 text-orange-800";
      case "fulfil_submitted":
        return "bg-green-100 text-green-800";
      case "order_created":
        return "bg-blue-100 text-blue-800";
      case "order_completed":
        return "bg-green-100 text-green-800";
      case "order_disputed":
        return "bg-red-100 text-red-800";
      case "order_auto_cancelled":
        return "bg-gray-100 text-gray-800";
      case "dispute_resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActionDescription = (actionType: string, actorName: string, teamName?: string, metrics?: any) => {
    // Only show team name for reseller actions, not staff or owner actions
    const isStaffAction = [
      "order_picked", "order_resumed", "order_passed", 
      "order_hold", "fulfil_submitted"
    ].includes(actionType);
    
    const isOwnerAction = [
      "dispute_resolved"
    ].includes(actionType);
    
    const teamText = (!isStaffAction && !isOwnerAction && teamName) ? ` (${teamName})` : "";
    
    switch (actionType) {
      case "order_picked":
        return `${actorName} picked an order`;
      case "order_resumed":
        return `${actorName} resumed an order from hold`;
      case "order_passed":
        return `${actorName} passed on an order${metrics?.decisionReason ? ` - ${metrics.decisionReason}` : ""}`;
      case "order_hold":
        return `${actorName} placed an order on hold${metrics?.decisionReason ? ` - ${metrics.decisionReason}` : ""}`;
      case "fulfil_submitted":
        return `${actorName} submitted fulfillment`;
      case "order_created":
        return `${actorName} created an order${teamText}`;
      case "order_completed":
        return `${actorName} completed an order${teamText}`;
      case "order_disputed":
        return `${actorName} disputed an order${teamText}${metrics?.disputeReason ? ` - ${metrics.disputeReason}` : ""}`;
      case "order_auto_cancelled":
        return `Order auto-cancelled${teamText}`;
      case "dispute_resolved":
        return `${actorName} resolved a dispute${teamText}`;
      default:
        return `${actorName} performed ${actionType}${teamText}`;
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get unique teams for filter
  const teams = Array.from(new Set(data.map(log => log.teamName).filter(Boolean))) as string[];

  // Filter data
  const filteredData = data.filter(log => {
    const matchesSearch = searchTerm === "" || 
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actionType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === "all" || log.actionType === filterAction;
    const matchesTeam = filterTeam === "all" || log.teamName === filterTeam;
    
    return matchesSearch && matchesAction && matchesTeam;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, team, or action..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Action Type</label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="order_picked">Order Picked</SelectItem>
                  <SelectItem value="order_resumed">Order Resumed</SelectItem>
                  <SelectItem value="order_passed">Order Passed</SelectItem>
                  <SelectItem value="order_hold">Order Hold</SelectItem>
                  <SelectItem value="fulfil_submitted">Fulfil Submitted</SelectItem>
                  <SelectItem value="order_created">Order Created</SelectItem>
                  <SelectItem value="order_completed">Order Completed</SelectItem>
                  <SelectItem value="order_disputed">Order Disputed</SelectItem>
                  <SelectItem value="order_auto_cancelled">Auto Cancelled</SelectItem>
                  <SelectItem value="dispute_resolved">Dispute Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Team</label>
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity ({filteredData.length} entries)
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className="text-sm">
                      <div className="space-y-1">
                        <div className="text-muted-foreground">
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), "MMM dd, yyyy 'at' HH:mm:ss")}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.actionType)}
                        <Badge className={getActionColor(log.actionType)}>
                          {formatActionType(log.actionType)}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-3 w-3" />
                        </div>
                        <span className="font-medium">{log.actorName}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {(() => {
                        // Determine if this is a staff or reseller action
                        const isStaffAction = [
                          "order_picked", "order_resumed", "order_passed", 
                          "order_hold", "fulfil_submitted"
                        ].includes(log.actionType);
                        
                        const isResellerAction = [
                          "order_created", "order_completed", "order_disputed"
                        ].includes(log.actionType);
                        
                        const isOwnerAction = [
                          "dispute_resolved"
                        ].includes(log.actionType);
                        
                        if (isStaffAction) {
                          return (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-600">Staff</span>
                            </div>
                          );
                        } else if (isResellerAction) {
                          return (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-600">Reseller</span>
                            </div>
                          );
                        } else if (isOwnerAction) {
                          return (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-purple-600">Owner</span>
                            </div>
                          );
                        } else {
                          // System actions
                          return (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-600">System</span>
                            </div>
                          );
                        }
                      })()}
                    </TableCell>
                    
                    <TableCell className="max-w-xs">
                      <div className="text-sm">
                        {getActionDescription(log.actionType, log.actorName, log.teamName, log.metrics)}
                        {log.metrics?.orderValue && (
                          <div className="text-muted-foreground mt-1">
                            Value: ${log.metrics.orderValue}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No activity logs found matching your filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
