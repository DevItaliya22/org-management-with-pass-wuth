"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OwnerPermissionsProps {
  orderId: string;
  order: any;
}

export default function OwnerPermissions({
  orderId,
  order,
}: OwnerPermissionsProps) {
  const router = useRouter();
  const { authSession } = useRole();
  const updateReadAccess = useMutation(api.orders.updateOrderReadAccess);
  const updateWriteAccess = useMutation(api.orders.updateOrderWriteAccess);

  // Permission management state
  const [selectedReadUsers, setSelectedReadUsers] = useState<string[]>([]);
  const [selectedWriteUsers, setSelectedWriteUsers] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [initialReadUsers, setInitialReadUsers] = useState<string[]>([]);
  const [initialWriteUsers, setInitialWriteUsers] = useState<string[]>([]);

  // Owner-side: only staff and owners (non-reseller users)
  const members = useQuery(api.orders.getOwnerSideMembersForPermissions, 
    authSession?.user?.id ? {
      orderId: orderId as any,
      userId: authSession.user.id as any,
    } : "skip"
  );

  // Initialize selected users when members data loads
  useEffect(() => {
    if (members) {
      const read = members
        .filter((m: any) => m.hasReadAccess)
        .map((m: any) => m._id);
      const write = members
        .filter((m: any) => m.hasWriteAccess)
        .map((m: any) => m._id);
      setSelectedReadUsers(read);
      setSelectedWriteUsers(write);
      setInitialReadUsers(read);
      setInitialWriteUsers(write);
    }
  }, [members]);

  const arraysEqualAsSet = (a: Array<string>, b: Array<string>) => {
    if (a.length !== b.length) return false;
    const setB = new Set(b);
    for (const v of a) if (!setB.has(v)) return false;
    return true;
  };

  const isDirty =
    !arraysEqualAsSet(selectedReadUsers, initialReadUsers) ||
    !arraysEqualAsSet(selectedWriteUsers, initialWriteUsers);

  const handleSavePermissions = async () => {
    try {
      setSavingPermissions(true);
      await Promise.all([
        updateReadAccess({
          orderId: orderId as any,
          userIds: selectedReadUsers as any,
          userId: authSession?.user?.id as any,
        }),
        updateWriteAccess({
          orderId: orderId as any,
          userIds: selectedWriteUsers as any,
          userId: authSession?.user?.id as any,
        }),
      ]);
      router.refresh();
    } catch (error) {
      console.error("Failed to update permissions:", error);
    } finally {
      setSavingPermissions(false);
    }
  };

  if (!members) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Read Access
              {selectedReadUsers.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {selectedReadUsers.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-auto">
            <DropdownMenuLabel>Select readers</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {members.map((member: any) => (
              <DropdownMenuCheckboxItem
                key={`read-${member._id}`}
                checked={selectedReadUsers.includes(member._id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedReadUsers((prev) => [...prev, member._id]);
                  } else {
                    setSelectedReadUsers((prev) => prev.filter((id) => id !== member._id));
                  }
                }}
              >
                <span className="truncate">{member.name || member.email}</span>
                <Badge className="ml-2" variant={member.role === "owner" ? "default" : "secondary"}>
                  {member.role}
                </Badge>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Write Access
              {selectedWriteUsers.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {selectedWriteUsers.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-auto">
            <DropdownMenuLabel>Select writers</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {members.map((member: any) => (
              <DropdownMenuCheckboxItem
                key={`write-${member._id}`}
                checked={selectedWriteUsers.includes(member._id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedWriteUsers((prev) => [...prev, member._id]);
                  } else {
                    setSelectedWriteUsers((prev) => prev.filter((id) => id !== member._id));
                  }
                }}
              >
                <span className="truncate">{member.name || member.email}</span>
                <Badge className="ml-2" variant={member.role === "owner" ? "default" : "secondary"}>
                  {member.role}
                </Badge>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={handleSavePermissions} disabled={savingPermissions || !isDirty} size="sm">
          {savingPermissions ? "Saving..." : "Save"}
        </Button>
      </div>
    </>
  );
}
