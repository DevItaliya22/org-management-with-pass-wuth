"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function TeamRequestsPage() {
  const role = useRole();
  const canView = role.isResellerDefaultMember || role.isResellerMember;

  const invites = useQuery(api.teams.listMyInvitations, {});
  const accept = useMutation(api.teams.acceptInvitation);
  const reject = useMutation(api.teams.rejectInvitation);

  if (!canView) return notFound();

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Team Join Requests</h2>
          <p className="text-sm text-muted-foreground">Review and respond to your pending invitations.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Invitations</CardTitle>
          </CardHeader>
          <CardContent>
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
                      <TableCell className="break-all">{i.invitedByEmail}</TableCell>
                      <TableCell>
                        {i.status === "rejected" ? (
                          <Badge variant="destructive">{i.status}</Badge>
                        ) : i.status === "pending" ? (
                          <Badge variant="outline">{i.status}</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-600 text-white hover:bg-green-600">{i.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(i.expiresAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{new Date(i.invitedAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {i.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" className="bg-green-600 text-white hover:bg-green-600" onClick={() => accept({ invitationId: i._id })}>Accept</Button>
                            <Button size="sm" variant="destructive" onClick={() => reject({ invitationId: i._id })}>Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-sm text-muted-foreground">No invitations.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
