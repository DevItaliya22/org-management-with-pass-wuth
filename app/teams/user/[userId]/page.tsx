"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import React, { useState } from "react";
import { useRole } from "@/hooks/use-role";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Copy } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "@/components/ui/sonner";

interface UserDetailPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const { isLoading, isResellerAdmin, isOwner, session } = useRole();

  const [isUpdating, setIsUpdating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [resolvedParams, setResolvedParams] = useState<{
    userId: string;
  } | null>(null);

  // Resolve params asynchronously
  React.useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const updateMemberStatus = useMutation(api.teams.updateMemberStatus);
  const updateUserName = useMutation(api.users.updateUserName);
  const userDetails = useQuery(
    api.teams.getUserDetails,
    resolvedParams ? { userId: resolvedParams.userId as Id<"users"> } : "skip",
  );

  // Sync editable name value when details load/change
  React.useEffect(() => {
    if (userDetails) {
      setNameValue(userDetails.name || "");
    }
  }, [userDetails]);

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
      toast.success("Status updated successfully");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update status");
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
          <h2 className="text-2xl font-semibold">User Not Found</h2>
          <p className="text-muted-foreground">
            The requested user could not be found.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 px-4 md:px-6 lg:px-8">
        <Toaster />
        {/* Primary details - full width, less carded */}
        <section className="rounded-lg bg-muted/20 p-5">
          <h3 className="text-lg font-semibold text-muted-foreground mb-4">
            Profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <dl className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <dt className="text-base text-muted-foreground">Email</dt>
                  <dd className="text-xl font-medium break-all">
                    {userDetails.email}
                  </dd>
                </div>
                <Button
                  variant="outline"
                  size="default"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(userDetails.email);
                      toast.success("Email copied to clipboard");
                    } catch {
                      toast.error("Failed to copy email");
                    }
                  }}
                  aria-label="Copy email"
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </div>
            </dl>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-base text-muted-foreground">Name</dt>
                <dd className="text-lg font-semibold flex items-center gap-3">
                  {session?.user?._id === resolvedParams.userId &&
                  editingName ? (
                    <>
                      <Input
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        placeholder="Enter your name"
                        className="w-56"
                      />
                      <Button
                        size="sm"
                        onClick={async () => {
                          const trimmed = nameValue.trim();
                          if (!trimmed) {
                            toast.error("Name cannot be empty");
                            return;
                          }
                          setIsUpdating(true);
                          try {
                            await updateUserName({ name: trimmed });
                            toast.success("Name updated");
                            setEditingName(false);
                          } catch (err: any) {
                            toast.error(
                              err?.message ?? "Failed to update name",
                            );
                          } finally {
                            setIsUpdating(false);
                          }
                        }}
                        disabled={isUpdating}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingName(false);
                          setNameValue(userDetails.name || "");
                        }}
                        disabled={isUpdating}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <span>{userDetails.name || "No name set"}</span>
                      {session?.user?._id === resolvedParams.userId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingName(true)}
                          aria-label="Edit name"
                        >
                          Edit
                        </Button>
                      )}
                    </>
                  )}
                </dd>
              </div>
              <Separator className="my-1" />
              <div className="flex items-center justify-between">
                <dt className="text-base text-muted-foreground">Role</dt>
                <dd>
                  <Badge variant="outline">
                    {userDetails.role || "No role set"}
                  </Badge>
                </dd>
              </div>
              <Separator className="my-1" />
              <div className="flex items-center justify-between">
                <dt className="text-base text-muted-foreground">
                  Email status
                </dt>
                <dd>
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
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Team & controls (hidden when viewing own profile) */}
        {!(session?.user?._id === resolvedParams.userId) && (
          <section className="rounded-lg bg-muted/20 p-5">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">
              Team & Access
            </h3>
            {userDetails.resellerMember ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base text-muted-foreground">
                      Team role
                    </span>
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
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-base text-muted-foreground">
                      Status
                    </span>
                    <Badge
                      variant={
                        userDetails.resellerMember.isActive &&
                        !userDetails.resellerMember.isBlocked
                          ? "default"
                          : userDetails.resellerMember.isBlocked
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {userDetails.resellerMember.isBlocked
                        ? "blocked"
                        : userDetails.resellerMember.isActive
                          ? "active"
                          : "inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base text-muted-foreground">
                      Active
                    </span>
                    <div className="flex items-center gap-2">
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
                      <span className="text-base text-muted-foreground">
                        {userDetails.resellerMember.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-base text-muted-foreground">
                      Blocked
                    </span>
                    <div className="flex items-center gap-2">
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
                      <span className="text-base text-muted-foreground">
                        {userDetails.resellerMember.isBlocked
                          ? "Blocked"
                          : "Not Blocked"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 text-base text-muted-foreground">
                User is not a member of any team
              </div>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
