"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notFound, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

interface UserDetailPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const { isLoading, isResellerAdmin, isOwner, session } = useRole();
  const router = useRouter();

  const [isUpdating, setIsUpdating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [resolvedParams, setResolvedParams] = useState<{
    userId: string;
  } | null>(null);

  // Resolve params asynchronously
  React.useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const updateMemberStatus = useMutation(api.teams.updateMemberStatus);
  const userDetails = useQuery(
    api.teams.getUserDetails,
    resolvedParams ? { userId: resolvedParams.userId as Id<"users"> } : "skip",
  );

  const handleStatusChange = async (
    field: "isActive" | "isBlocked",
    value: boolean,
  ) => {
    if (!userDetails?.resellerMember) return;

    setIsUpdating(true);
    try {
      await updateMemberStatus({
        memberId: userDetails.resellerMember._id,
        [field]: value,
      });
      setMsg("Status updated successfully");
    } catch (err: any) {
      setMsg(err?.message ?? "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return null;

  if (!resolvedParams) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (userDetails === undefined) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading user details...</span>
        </div>
      </DashboardLayout>
    );
  }

  // Access control: self-view allowed; owner can view anyone; reseller admin can view users in their own team
  const isSelf =
    resolvedParams?.userId && session?.user?._id === resolvedParams.userId;
  let allowed = false;
  if (isOwner) {
    allowed = true;
  } else if (isSelf) {
    allowed = true;
  } else if (isResellerAdmin) {
    const viewerTeamId = session?.resellerMember?.teamId;
    const targetTeamId = userDetails?.resellerMember?.teamId;
    if (viewerTeamId && targetTeamId && viewerTeamId === targetTeamId) {
      allowed = true;
    }
  }

  if (!allowed) return notFound();

  if (userDetails === null) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold">User Not Found</h2>
          <p className="text-muted-foreground">
            The requested user could not be found.
          </p>
          <Button className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {userDetails.name || "User Details"}
              </h2>
              <p className="text-sm text-muted-foreground">
                View and manage user information
              </p>
            </div>
          </div>
        </div>

        {/* User Information */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={userDetails.name || "No name set"}
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={userDetails.email}
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>User Role</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {userDetails.role || "No role set"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Verified</Label>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={
                      userDetails.emailVerificationTime
                        ? "default"
                        : "secondary"
                    }
                  >
                    {userDetails.emailVerificationTime
                      ? "Verified"
                      : "Not Verified"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Membership */}
          <Card>
            <CardHeader>
              <CardTitle>Team Membership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userDetails.resellerMember ? (
                <>
                  <div className="space-y-2">
                    <Label>Team Role</Label>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          userDetails.resellerMember.role === "admin"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {userDetails.resellerMember.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          userDetails.resellerMember.status === "active_member"
                            ? "default"
                            : userDetails.resellerMember.status ===
                                "suspended_member"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {userDetails.resellerMember.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Active Status</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userDetails.resellerMember.isActive}
                        onCheckedChange={(checked) =>
                          handleStatusChange("isActive", checked)
                        }
                        disabled={
                          isUpdating ||
                          userDetails.resellerMember.role === "admin"
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {userDetails.resellerMember.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Blocked Status</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userDetails.resellerMember.isBlocked}
                        onCheckedChange={(checked) =>
                          handleStatusChange("isBlocked", checked)
                        }
                        disabled={
                          isUpdating ||
                          userDetails.resellerMember.role === "admin"
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {userDetails.resellerMember.isBlocked
                          ? "Blocked"
                          : "Not Blocked"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <Input
                      value={new Date(
                        userDetails.resellerMember.createdAt,
                      ).toLocaleDateString()}
                      disabled
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Updated</Label>
                    <Input
                      value={new Date(
                        userDetails.resellerMember.updatedAt,
                      ).toLocaleDateString()}
                      disabled
                      className="bg-muted/50"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  User is not a member of any team
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        {userDetails.resellerMember && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input
                    value={userDetails._id}
                    disabled
                    className="bg-muted/50 font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Member ID</Label>
                  <Input
                    value={userDetails.resellerMember._id}
                    disabled
                    className="bg-muted/50 font-mono text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {msg && (
          <Alert>
            <AlertDescription>{msg}</AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}
