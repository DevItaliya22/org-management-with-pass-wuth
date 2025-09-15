"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Shield, Users, Crown, Briefcase } from "lucide-react";

const roleIcons = {
  owner: Crown,
  reseller: Briefcase,
  staff: Shield,
  admin: Users,
  member: User,
};

const roleColors = {
  owner: "bg-purple-100 text-purple-800 border-purple-200",
  reseller: "bg-blue-100 text-blue-800 border-blue-200",
  staff: "bg-green-100 text-green-800 border-green-200",
  admin: "bg-orange-100 text-orange-800 border-orange-200",
  member: "bg-gray-100 text-gray-800 border-gray-200",
};

export function RoleInfo() {
  const sessionData = useQuery(api.session.getCurrentUserSession);

  if (sessionData === undefined) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            Role Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-pulse text-sm text-muted-foreground">
              Loading...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessionData === null) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            Role Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-muted-foreground">
              Not authenticated
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { user, resellerMember, team } = sessionData;
  const userRole = user.role;
  const memberRole = resellerMember?.role;
  const memberStatus = resellerMember?.status;

  // Get the appropriate icon and color for the primary role
  const getPrimaryRoleInfo = () => {
    if (userRole === "owner") {
      return { role: "Owner", icon: roleIcons.owner, color: roleColors.owner };
    } else if (userRole === "staff") {
      return { role: "Staff", icon: roleIcons.staff, color: roleColors.staff };
    } else if (userRole === "reseller") {
      if (memberRole === "admin") {
        return {
          role: "Reseller Admin",
          icon: roleIcons.admin,
          color: roleColors.admin,
        };
      } else {
        return {
          role: "Reseller Member",
          icon: roleIcons.member,
          color: roleColors.member,
        };
      }
    }
    return { role: "User", icon: roleIcons.member, color: roleColors.member };
  };

  const primaryRole = getPrimaryRoleInfo();
  const IconComponent = primaryRole.icon;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <IconComponent className="h-5 w-5" />
          Role Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Role Badge */}
        <div className="flex items-center justify-center">
          <Badge
            variant="outline"
            className={`px-4 py-2 text-sm font-semibold ${primaryRole.color}`}
          >
            <IconComponent className="h-4 w-4 mr-2" />
            {primaryRole.role}
          </Badge>
        </div>

        {/* Detailed Role Information */}
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">User Role:</span>
            <Badge variant="secondary" className="text-xs">
              {userRole || "Not set"}
            </Badge>
          </div>

          {resellerMember && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Member Role:</span>
                <Badge variant="secondary" className="text-xs">
                  {memberRole}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    memberStatus === "active_member"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : memberStatus === "default_member"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : memberStatus === "pending_invitation"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                          : "bg-red-100 text-red-800 border-red-200"
                  }`}
                >
                  {memberStatus?.replace("_", " ")}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Active:</span>
                <span
                  className={
                    resellerMember.isActive ? "text-green-600" : "text-red-600"
                  }
                >
                  {resellerMember.isActive ? "✅ Yes" : "❌ No"}
                </span>
              </div>
            </>
          )}

          {team && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Team:</span>
              <span className="font-medium">{team.name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
