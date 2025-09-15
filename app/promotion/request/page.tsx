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
import GradientButton from "@/components/ui/gradient-button";

export default function PromotionPage() {
  const role = useRole();
  const canView = !!role.isResellerDefaultMember;

  const teamId = role.session?.team?._id;
  const myRequests = useQuery(api.teams.listMyPromotionRequests, {});
  const requestPromotion = useMutation(api.teams.requestPromotion);

  if (!canView) return notFound();

  const sendRequest = async () => {
    if (!teamId) return;
    await requestPromotion({ teamId });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Promotion</h2>
          <p className="text-sm text-muted-foreground">Request admin rights for your current team.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="min-w-[220px]">
            <GradientButton onClick={sendRequest} disabled={!teamId}>
              Request Admin Promotion
            </GradientButton>
          </div>
          {!teamId && (
            <span className="text-xs text-muted-foreground">Join or select a team to request promotion.</span>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Your Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {myRequests && myRequests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Requested At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequests.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">{r.teamName}</TableCell>
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
              <div className="text-sm text-muted-foreground">No requests yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


