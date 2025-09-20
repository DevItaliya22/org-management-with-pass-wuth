"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PromotionRequestsPage() {
  const { isLoading, isOwner, authSession } = useRole();
  const requests = useQuery(
    api.teams.listPromotionRequests,
    isLoading ? (undefined as any) : ({} as any),
  );
  const review = useMutation(api.teams.reviewPromotionRequest);
  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const history = (requests ?? []).filter((r) => r.status !== "pending");

  if (isLoading) return null;
  if (!isOwner) return notFound();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-base font-semibold">Pending Requests</h2>
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
                    <TableCell className="text-right">
                      {new Date(r.requestedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 text-white hover:bg-green-600"
                          onClick={async () => {
                            try {
                              await review({ requestId: r._id, approve: true, userId: authSession?.user?.id as any });
                              toast.success("Promotion request approved");
                            } catch (e: any) {
                              toast.error(e?.message ?? "Failed to approve");
                            }
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            try {
                              await review({ requestId: r._id, approve: false, userId: authSession?.user?.id as any });
                              toast.success("Promotion request rejected");
                            } catch (e: any) {
                              toast.error(e?.message ?? "Failed to reject");
                            }
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center border rounded-md py-12 text-center text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2" />
              <div>No pending requests</div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold">History</h2>
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
                        <Badge
                          variant="outline"
                          className="bg-green-600 text-white hover:bg-green-600"
                        >
                          {r.status}
                        </Badge>
                      ) : r.status === "rejected" ? (
                        <Badge variant="destructive">{r.status}</Badge>
                      ) : (
                        <Badge variant="outline">{r.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Date(r.requestedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center border rounded-md py-12 text-center text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2" />
              <div>No past requests</div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
