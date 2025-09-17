"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface StaffPermissionsProps {
  orderId: string;
  order: any;
}

export default function StaffPermissions({
  orderId,
  order,
}: StaffPermissionsProps) {
  // Get access info for this order (read-only view for staff)
  const accessInfo = useQuery(api.orders.getOrderAccessInfo, {
    orderId: orderId as any,
  });

  if (!accessInfo) return null;

  const hasAccessUsers =
    accessInfo.readAccessUsers.length > 0 ||
    accessInfo.writeAccessUsers.length > 0;

  if (!hasAccessUsers) return null;

  return (
    <>
      <Separator />
      <section className="space-y-4">
        <h3 className="font-medium text-sm">
          Team Members with Access (Staff View)
        </h3>

        {/* Read Access */}
        {accessInfo.readAccessUsers.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Team Members with Read Access
            </label>
            <div className="space-y-1">
              {accessInfo.readAccessUsers.map((user: any) => (
                <div
                  key={`read-${user._id}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <span>{user.name || user.email}</span>
                  <Badge variant="outline" className="text-xs">
                    Read
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Write Access */}
        {accessInfo.writeAccessUsers.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Team Members with Write Access
            </label>
            <div className="space-y-1">
              {accessInfo.writeAccessUsers.map((user: any) => (
                <div
                  key={`write-${user._id}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <span>{user.name || user.email}</span>
                  <Badge variant="outline" className="text-xs">
                    Write
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intentionally no footer for staff */}
      </section>
    </>
  );
}
