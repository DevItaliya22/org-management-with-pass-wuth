"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import { useState } from "react";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Edit, Plus, Loader2 } from "lucide-react";
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

  const onCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateStatus(null);
    setIsCreating(true);
    try {
      await createStaff({ email, password });
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

    setIsUpdating(true);
    try {
      await updateStaffName({ userId: editingStaff.userId, name: editName });
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Staff Management
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage your staff members and their accounts.
            </p>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
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
                    required
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
                    required
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
                  >
                    Create Staff
                  </GradientButton>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Staff Members</CardTitle>
          </CardHeader>
          <CardContent>
            {staffMembers === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading staff members...</span>
              </div>
            ) : staffMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No staff members found. Create your first staff member to get
                started.
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
                                : "outline"
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
          </CardContent>
        </Card>

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
