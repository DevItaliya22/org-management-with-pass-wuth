"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import { useState } from "react";
import { useRole } from "@/hooks/use-role";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GradientButton from "@/components/ui/gradient-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Plus, Loader2, Inbox } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function StaffManagementPage() {
  const { isLoading, isOwner } = useRole();

  // Queries and mutations
  const staffMembers = useQuery(
    api.staff.getAllStaff,
    isLoading ? (undefined as any) : ({} as any),
  );
  const createStaff = useAction(api.staff.createStaffWithPassword);
  const updateStaffName = useMutation(
    api.staff.updateStaffName,
  ).withOptimisticUpdate((localStore, args) => {
    const currentStaff = localStore.getQuery(api.staff.getAllStaff, {});
    if (currentStaff !== undefined) {
      const updatedStaff = currentStaff.map((staff) =>
        staff.userId === args.userId
          ? { ...staff, user: { ...staff.user, name: args.name } }
          : staff,
      );
      localStore.setQuery(api.staff.getAllStaff, {}, updatedStaff);
    }
  });

  // Create staff modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Edit staff modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<{
    userId: Id<"users">;
    name: string;
    email: string;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [editStatus, setEditStatus] = useState<string | null>(null);

  const isValidEmail = (value: string) => /.+@.+\..+/.test(value);
  const canCreate = isValidEmail(email.trim()) && password.trim().length > 0;
  const canUpdate = editName.trim().length > 0;

  const onCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateStatus(null);
    setIsCreating(true);
    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      if (!isValidEmail(trimmedEmail) || !trimmedPassword) {
        setCreateStatus("Valid email and password are required");
        return;
      }
      await createStaff({ email: trimmedEmail, password: trimmedPassword });
      setCreateStatus("Staff created successfully");
      setEmail("");
      setPassword("");
      setIsCreateModalOpen(false);
    } catch (e: any) {
      setCreateStatus(e?.message ?? "Failed to create staff");
    } finally {
      setIsCreating(false);
    }
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditStatus(null);
    setIsUpdating(true);
    try {
      const trimmedName = editName.trim();
      if (!trimmedName) {
        setEditStatus("Name is required");
        return;
      }
      await updateStaffName({ userId: editingStaff.userId, name: trimmedName });
      setIsEditModalOpen(false);
      setEditingStaff(null);
      setEditName("");
    } catch (e: any) {
      console.error("Failed to update staff name:", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditModal = (staff: {
    userId: Id<"users">;
    name?: string;
    email: string;
  }) => {
    setEditingStaff({
      userId: staff.userId,
      name: staff.name || "",
      email: staff.email,
    });
    setEditName(staff.name || "");
    setIsEditModalOpen(true);
  };

  if (isLoading) return null;
  if (!isOwner) return notFound();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Staff Management
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage your staff members and their accounts.
            </p>
          </div>
          <Dialog
            open={isCreateModalOpen}
            onOpenChange={(open) => {
              setIsCreateModalOpen(open);
              if (open) {
                setCreateStatus(null);
                setEmail("");
                setPassword("");
              }
            }}
          >
            <DialogTrigger asChild>
              <div className="min-w-[220px]">
                <GradientButton>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff
                </GradientButton>
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Staff Member</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={onCreateSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. alex@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a secure password"
                  />
                </div>
                {createStatus && (
                  <Alert>
                    <AlertDescription>{createStatus}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <GradientButton
                    type="submit"
                    isLoading={isCreating}
                    loadingText="Creating..."
                    disabled={isCreating || !canCreate}
                  >
                    Create Staff
                  </GradientButton>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Staff Members
          </h3>
          {staffMembers === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading staff members...</span>
            </div>
          ) : staffMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center border rounded-md py-12 text-center text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2" />
              <div>No staff members found</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMembers.map((staff) => (
                  <TableRow key={staff._id}>
                    <TableCell className="font-medium">
                      {staff.user.name || "No name set"}
                    </TableCell>
                    <TableCell>{staff.user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          staff.status === "online"
                            ? "default"
                            : staff.status === "paused"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {staff.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          openEditModal({
                            userId: staff.user._id,
                            name: staff.user.name,
                            email: staff.user.email,
                          })
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Edit Staff Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
            </DialogHeader>
            {editingStaff && (
              <form className="space-y-4" onSubmit={onEditSubmit}>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={editingStaff.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editName">Name</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter staff member name"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <GradientButton
                    type="submit"
                    isLoading={isUpdating}
                    loadingText="Updating..."
                  >
                    Update
                  </GradientButton>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
