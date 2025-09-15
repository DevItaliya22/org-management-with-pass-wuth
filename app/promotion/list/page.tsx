"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PromotionRequestsPage() {
  const role = useRole();
  const canView = !!role.isOwner;

  const requests = useQuery(api.teams.listPromotionRequests, {} as any);
  const review = useMutation(api.teams.reviewPromotionRequest);
  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const history = (requests ?? []).filter((r) => r.status !== "pending");

  if (!canView) return notFound();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {pending.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead className="text-right">Requested At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">{r.teamName}</TableCell>
                      <TableCell>{r.requesterName}</TableCell>
                      <TableCell className="text-right">{new Date(r.requestedAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" className="bg-green-600 text-white hover:bg-green-600" onClick={() => review({ requestId: r._id, approve: true })}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => review({ requestId: r._id, approve: false })}>Reject</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-sm text-muted-foreground">No pending requests.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Requested At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">{r.teamName}</TableCell>
                      <TableCell>{r.requesterName}</TableCell>
                      <TableCell>
                        {r.status === "approved" ? (
                          <Badge variant="outline" className="bg-green-600 text-white hover:bg-green-600">
                            {r.status}
                          </Badge>
                        ) : r.status === "rejected" ? (
                          <Badge variant="destructive">{r.status}</Badge>
                        ) : (
                          <Badge variant="outline">{r.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{new Date(r.requestedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-sm text-muted-foreground">No past requests.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
