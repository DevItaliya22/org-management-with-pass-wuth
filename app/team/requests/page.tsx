"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import { useRole } from "@/hooks/use-role";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export default function TeamRequestsPage() {
  const { isLoading, isResellerDefaultMember, isResellerMember } = useRole();
  const invites = useQuery(
    api.teams.listMyInvitations,
    isLoading ? (undefined as any) : {},
  );
  const accept = useMutation(api.teams.acceptInvitation);
  const reject = useMutation(api.teams.rejectInvitation);

  if (isLoading) return null;
  const canView = isResellerDefaultMember || isResellerMember;
  if (!canView) return notFound();

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Team Join Requests
          </h2>
          <p className="text-sm text-muted-foreground">
            Review and respond to your pending invitations.
          </p>
        </div>

        <div className="space-y-2">
          {invites && invites.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Invited At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((i) => (
                  <TableRow key={i._id}>
                    <TableCell className="font-medium">{i.teamName}</TableCell>
                    <TableCell className="break-all">
                      {i.invitedByEmail}
                    </TableCell>
                    <TableCell>
                      {i.status === "rejected" ? (
                        <Badge variant="destructive">{i.status}</Badge>
                      ) : i.status === "pending" ? (
                        <Badge variant="outline">{i.status}</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-green-600 text-white hover:bg-green-600"
                        >
                          {i.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(i.expiresAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Date(i.invitedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {i.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-600"
                            onClick={async () => {
                              try {
                                await accept({ invitationId: i._id });
                                toast.success("Invitation accepted");
                              } catch (e: any) {
                                toast.error(e?.message ?? "Failed to accept");
                              }
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              try {
                                await reject({ invitationId: i._id });
                                toast.success("Invitation rejected");
                              } catch (e: any) {
                                toast.error(e?.message ?? "Failed to reject");
                              }
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
              <div className="text-lg font-medium text-muted-foreground">
                No invitations on this page
              </div>
              <div className="text-sm text-muted-foreground">
                You’ll see your team invitations here when you have any.
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
