"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import { useState } from "react";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Edit, Eye, Loader2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

export default function TeamManagementPage() {
  const role = useRole();
  const isAdmin = role?.isResellerAdmin;

  const team = role?.session?.team;
  const [name, setName] = useState(team?.name ?? "");
  const [slug, setSlug] = useState(team?.slug ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateTeam = useMutation(api.teams.updateTeam);
  const updateMemberStatus = useMutation(api.teams.updateMemberStatus);
  const teamMembers = useQuery(
    api.teams.getTeamMembers,
    team?._id ? { teamId: team._id } : "skip",
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team?._id) return;
    setIsUpdating(true);
    try {
      await updateTeam({ teamId: team._id, name, slug });
      setMsg("Team updated successfully");
      setIsEditModalOpen(false);
    } catch (err: any) {
      setMsg(err?.message ?? "Failed to update team");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMemberStatusChange = async (
    memberId: Id<"resellerMembers">,
    field: "isActive" | "isBlocked",
    value: boolean,
  ) => {
    try {
      await updateMemberStatus({
        memberId,
        [field]: value,
      });
    } catch (err: any) {
      console.error("Failed to update member status:", err);
    }
  };

  if (!isAdmin) return notFound();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Team Name and Edit Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {team?.name || "Team Management"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage your team members and settings.
            </p>
          </div>
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Team Details</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team name</Label>
                  <Input
                    id="team-name"
                    placeholder="Team name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-slug">Slug</Label>
                  <Input
                    id="team-slug"
                    placeholder="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
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
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Team Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            {teamMembers === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading team members...</span>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No team members found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Blocked</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow
                      key={member._id}
                      className={
                        member.role === "admin"
                          ? "bg-blue-50/50 dark:bg-blue-950/20"
                          : ""
                      }
                    >
                      <TableCell className="font-medium">
                        {member.user.name || "No name set"}
                        {member.role === "admin" && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Admin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{member.user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.role === "admin" ? "default" : "secondary"
                          }
                        >
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.status === "active_member"
                              ? "default"
                              : member.status === "suspended_member"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {member.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={member.isActive}
                          onCheckedChange={(checked) =>
                            handleMemberStatusChange(
                              member._id,
                              "isActive",
                              checked,
                            )
                          }
                          disabled={member.role === "admin"}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={member.isBlocked}
                          onCheckedChange={(checked) =>
                            handleMemberStatusChange(
                              member._id,
                              "isBlocked",
                              checked,
                            )
                          }
                          disabled={member.role === "admin"}
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/teams/user/${member.user._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {msg && (
          <Alert>
            <AlertDescription>{msg}</AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}
