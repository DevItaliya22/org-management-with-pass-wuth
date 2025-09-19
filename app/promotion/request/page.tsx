"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import { useRole } from "@/hooks/use-role";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import GradientButton from "@/components/ui/gradient-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

export default function PromotionPage() {
  const { isLoading, isResellerDefaultMember, session } = useRole();

  const [ready, setReady] = useState(false);
  const [canView, setCanView] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setReady(true);
      setCanView(!!isResellerDefaultMember);
    }
  }, [isLoading, isResellerDefaultMember]);

  const teamId = session?.team?._id;

  const myRequests = useQuery(
    api.teams.listMyPromotionRequests,
    ready ? {} : undefined,
  );
  const requestPromotion = useMutation(api.teams.requestPromotion);

  if (!ready) return null;
  if (!canView) return notFound();

  const sendRequest = async () => {
    if (!teamId) return;
    try {
      setIsSubmitting(true);
      await requestPromotion({ teamId });
      toast.success("Request sent");
      setConfirmOpen(false);
    } catch (error) {
      toast.error("Failed to send request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Promotion</h2>
          <p className="text-sm text-muted-foreground">
            Request admin rights for your current team.
          </p>
        </div>

        <div className="flex items-center gap-2 justify-end">
          {!teamId && (
            <span className="text-xs text-muted-foreground mr-auto">
              Join or select a team to request promotion.
            </span>
          )}
          <div className="min-w-[220px]">
            <GradientButton
              onClick={() => setConfirmOpen(true)}
              disabled={!teamId || isSubmitting}
            >
              Request Admin Promotion
            </GradientButton>
          </div>
        </div>

        <div className="space-y-2">
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
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
              <div className="text-lg font-medium text-muted-foreground">
                No requests on this page
              </div>
              <div className="text-sm text-muted-foreground">
                You’ll see your admin promotion requests here when you have any.
              </div>
            </div>
          )}
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Confirm Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Do you want to request the owner to become reseller admin?
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <GradientButton
                  onClick={sendRequest}
                  isLoading={isSubmitting}
                  loadingText="Requesting..."
                  disabled={isSubmitting}
                >
                  Confirm
                </GradientButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
