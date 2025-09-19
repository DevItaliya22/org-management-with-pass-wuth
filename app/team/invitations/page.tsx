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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";

export default function TeamInvitationsPage() {
  const { isLoading, isResellerAdmin, session } = useRole();
  const isAdmin = isResellerAdmin;
  const teamId = session?.team?._id;

  const [email, setEmail] = useState("");
  const invite = useMutation(api.teams.inviteToTeam);
  const invitations = useQuery(
    api.teams.listTeamInvitations,
    isLoading
      ? (undefined as any)
      : teamId
        ? { teamId, status: undefined }
        : ("skip" as any),
  );

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || !email) return;
    try {
      await invite({ teamId, invitedEmail: email });
      toast.success("Invitation sent");
      setEmail("");
      setInviteOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send invitation");
    }
  };

  const [inviteOpen, setInviteOpen] = useState(false);

  if (isLoading) return null;
  if (!isAdmin) return notFound();

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Team Invitations
            </h2>
            <p className="text-sm text-muted-foreground">
              Invite members to your team and track invitation status.
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)} disabled={!teamId}>
            Invite
          </Button>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your team.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-3" onSubmit={onInvite}>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!teamId || !email}>
                  Send Invite
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            {invitations && invitations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Invited At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((i) => (
                    <TableRow key={i._id}>
                      <TableCell className="font-medium break-all">
                        {i.invitedEmail}
                      </TableCell>
                      <TableCell>
                        {i.status === "rejected" ? (
                          <Badge variant="destructive">{i.status}</Badge>
                        ) : i.status === "expired" ? (
                          <Badge variant="outline">{i.status}</Badge>
                        ) : i.status !== "pending" ? (
                          <Badge
                            variant="outline"
                            className="bg-green-600 text-white hover:bg-green-600"
                          >
                            {i.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{i.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Date(i.invitedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-sm text-muted-foreground">
                No invitations yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
