"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ResellerAdminPermissionsProps {
  orderId: string;
  order: any;
}

export default function ResellerAdminPermissions({
  orderId,
  order,
}: ResellerAdminPermissionsProps) {
  const router = useRouter();
  const updateReadAccess = useMutation(api.orders.updateOrderReadAccess);
  const updateWriteAccess = useMutation(api.orders.updateOrderWriteAccess);

  // Permission management state
  const [selectedReadUsers, setSelectedReadUsers] = useState<string[]>([]);
  const [selectedWriteUsers, setSelectedWriteUsers] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Get team members for permission management (admin can manage team members)
  const teamMembers = useQuery(api.orders.getTeamMembersForPermissions, {
    orderId: orderId as any,
  });

  // Initialize selected users when team members data loads
  useEffect(() => {
    if (teamMembers) {
      setSelectedReadUsers(
        teamMembers.filter((m: any) => m.hasReadAccess).map((m: any) => m._id),
      );
      setSelectedWriteUsers(
        teamMembers.filter((m: any) => m.hasWriteAccess).map((m: any) => m._id),
      );
    }
  }, [teamMembers]);

  const handleSavePermissions = async () => {
    try {
      setSavingPermissions(true);
      await Promise.all([
        updateReadAccess({
          orderId: orderId as any,
          userIds: selectedReadUsers as any,
        }),
        updateWriteAccess({
          orderId: orderId as any,
          userIds: selectedWriteUsers as any,
        }),
      ]);
      router.refresh();
    } catch (error) {
      console.error("Failed to update permissions:", error);
    } finally {
      setSavingPermissions(false);
    }
  };

  if (!teamMembers) return null;

  return (
    <>
      <Separator />
      <section className="space-y-4">
        <h3 className="font-medium text-sm">Team Access Permissions (Admin)</h3>

        {/* Read Access */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Read Access</label>
          <div className="space-y-2">
            {teamMembers.map((member: any) => (
              <div
                key={`read-${member._id}`}
                className="flex items-center space-x-2"
              >
                <Checkbox
                  id={`read-${member._id}`}
                  checked={selectedReadUsers.includes(member._id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedReadUsers((prev) => [...prev, member._id]);
                    } else {
                      setSelectedReadUsers((prev) =>
                        prev.filter((id) => id !== member._id),
                      );
                    }
                  }}
                />
                <label
                  htmlFor={`read-${member._id}`}
                  className="text-sm cursor-pointer flex items-center gap-2"
                >
                  {member.name || member.email}
                  <Badge
                    variant={member.role === "admin" ? "default" : "secondary"}
                  >
                    {member.role}
                  </Badge>
                </label>
              </div>
            ))}
          </div>
          {selectedReadUsers.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {selectedReadUsers.length} member
              {selectedReadUsers.length !== 1 ? "s" : ""} selected
            </div>
          )}
        </div>

        {/* Write Access */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Write Access</label>
          <div className="space-y-2">
            {teamMembers.map((member: any) => (
              <div
                key={`write-${member._id}`}
                className="flex items-center space-x-2"
              >
                <Checkbox
                  id={`write-${member._id}`}
                  checked={selectedWriteUsers.includes(member._id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedWriteUsers((prev) => [...prev, member._id]);
                    } else {
                      setSelectedWriteUsers((prev) =>
                        prev.filter((id) => id !== member._id),
                      );
                    }
                  }}
                />
                <label
                  htmlFor={`write-${member._id}`}
                  className="text-sm cursor-pointer flex items-center gap-2"
                >
                  {member.name || member.email}
                  <Badge
                    variant={member.role === "admin" ? "default" : "secondary"}
                  >
                    {member.role}
                  </Badge>
                </label>
              </div>
            ))}
          </div>
          {selectedWriteUsers.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {selectedWriteUsers.length} member
              {selectedWriteUsers.length !== 1 ? "s" : ""} selected
            </div>
          )}
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSavePermissions}
          disabled={savingPermissions}
          size="sm"
        >
          {savingPermissions ? "Saving..." : "Save Permissions"}
        </Button>
      </section>
    </>
  );
}
