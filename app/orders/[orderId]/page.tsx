"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/use-role";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import OwnerPermissions from "./OwnerPermissions";
import ResellerAdminPermissions from "./ResellerAdminPermissions";
import ResellerMemberPermissions from "./ResellerMemberPermissions";
import StaffPermissions from "./StaffPermissions";

export default function OrderDetailsPage() {
  const {
    isLoading,
    isReseller,
    isOwner,
    isResellerAdmin,
    isResellerMember,
    isStaff,
  } = useRole();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setReady(true);
      setAllowed(!!(isReseller || isOwner || isStaff));
    }
  }, [isLoading, isReseller, isOwner, isStaff]);

  const params = useParams();
  const orderId = params?.orderId as string | undefined;
  const router = useRouter();

  const order = useQuery(
    api.orders.getOrderById,
    orderId ? ({ orderId } as any) : "skip",
  );
  const disputes = useQuery(
    api.orders.getDisputesByOrder,
    orderId ? ({ orderId } as any) : "skip",
  );
  const disputeUserIds: string[] =
    disputes && disputes.length > 0
      ? Array.from(new Set(disputes.map((d: any) => d.raisedByUserId)))
      : [];
  const disputeUserLabels = useQuery(
    api.orders.getUserLabels,
    disputeUserIds.length
      ? ({ userIds: disputeUserIds } as any)
      : ("skip" as any),
  );
  const disputeRoles = useQuery(
    api.orders.getUserTeamRoles,
    order && disputeUserIds.length
      ? ({ teamId: order.teamId, userIds: disputeUserIds } as any)
      : ("skip" as any),
  );

  const completeOrder = useMutation(api.orders.completeOrder);
  const raiseDispute = useMutation(api.orders.raiseDispute);

  const [completing, setCompleting] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  if (!ready || order === undefined) return <div className="p-4">Loading…</div>;
  if (!allowed) return notFound();
  if (order === null)
    return <div className="p-4">Order not found or not authorized</div>;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {isReseller && order.status === "fulfil_submitted" && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={completing}
              onClick={async () => {
                try {
                  setCompleting(true);
                  await completeOrder({ orderId: order._id });
                  router.refresh();
                } finally {
                  setCompleting(false);
                }
              }}
            >
              {completing ? "Completing…" : "Mark Complete"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDisputeOpen(true)}
            >
              Raise Dispute
            </Button>
          </div>
        )}
        <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Raise Dispute</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe the issue"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDisputeOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!disputeReason.trim()}
                onClick={async () => {
                  if (!disputeReason.trim()) return;
                  await raiseDispute({
                    orderId: order._id,
                    reason: disputeReason.trim(),
                  });
                  setDisputeOpen(false);
                  setDisputeReason("");
                  router.refresh();
                }}
              >
                Submit Dispute
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Details + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="order-1 lg:col-span-1">
            <CardHeader>
              <CardTitle>Order from {order.merchant}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="space-y-2">
                <h3 className="font-medium text-sm">Customer</h3>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <span className="col-span-2 font-medium">
                    {order.customerName}
                  </span>
                  <span className="text-muted-foreground">Location</span>
                  <span className="col-span-2">
                    {order.country}, {order.city}
                  </span>
                  {order.contact && (
                    <>
                      <span className="text-muted-foreground">Contact</span>
                      <span className="col-span-2 break-all">
                        {order.contact}
                      </span>
                    </>
                  )}
                </div>
              </section>
              <Separator />
              <section className="space-y-2">
                <h3 className="font-medium text-sm">Order</h3>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">Merchant</span>
                  <span className="col-span-2 font-medium break-all">
                    {order.merchant}
                  </span>
                  <span className="text-muted-foreground">Cart Value</span>
                  <span className="col-span-2 font-medium">
                    ${order.cartValueUsd}
                  </span>
                  <span className="text-muted-foreground">SLA</span>
                  <span className="col-span-2">{order.sla}</span>
                  <span className="text-muted-foreground">Status</span>
                  <span className="col-span-2 font-medium">{order.status}</span>
                  {order.status === "on_hold" && order.holdReason && (
                    <>
                      <span className="text-muted-foreground">Hold Reason</span>
                      <span className="col-span-2 break-words">
                        {order.holdReason}
                      </span>
                    </>
                  )}
                </div>
              </section>
              {order.fulfilment && (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h3 className="font-medium text-sm">Fulfilment</h3>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-muted-foreground">
                        Merchant Link
                      </span>
                      <span className="col-span-2 break-all">
                        {order.fulfilment.merchantLink}
                      </span>
                      <span className="text-muted-foreground">
                        Name on Order
                      </span>
                      <span className="col-span-2">
                        {order.fulfilment.nameOnOrder}
                      </span>
                      <span className="text-muted-foreground">
                        Final Value (USD)
                      </span>
                      <span className="col-span-2 font-medium">
                        ${order.fulfilment.finalValueUsd}
                      </span>
                    </div>
                  </section>
                </>
              )}
              {(isOwner || isReseller) && disputes && disputes.length > 0 && (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h3 className="font-medium text-sm">Disputes</h3>
                    <div className="space-y-2">
                      {disputes.map((d: any) => (
                        <div key={d._id} className="rounded border p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{d.status}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(d.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-1">Reason: {d.reason}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Raised by:{" "}
                            {disputeUserLabels?.[d.raisedByUserId]?.name ??
                              disputeUserLabels?.[d.raisedByUserId]?.email ??
                              "User"}
                            {disputeRoles?.[d.raisedByUserId] &&
                              ` (${disputeRoles[d.raisedByUserId]})`}
                          </div>
                          {d.adjustmentAmountUsd && (
                            <div className="mt-1">
                              Adjustment: ${d.adjustmentAmountUsd}
                            </div>
                          )}
                          {d.resolutionNotes && (
                            <div className="mt-1">
                              Notes: {d.resolutionNotes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* Conditional Permission Components Based on Role */}
              {isOwner && orderId && (
                <OwnerPermissions orderId={orderId} order={order} />
              )}
              {isResellerAdmin && orderId && (
                <ResellerAdminPermissions orderId={orderId} order={order} />
              )}
              {isResellerMember && orderId && (
                <ResellerMemberPermissions orderId={orderId} order={order} />
              )}
              {isStaff && orderId && (
                <StaffPermissions orderId={orderId} order={order} />
              )}
            </CardContent>
          </Card>
          {/* Chat (UI only, disabled) */}
          <div className="order-2 lg:col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <ScrollArea className="flex-1 h-[55vh] rounded border p-2 bg-card">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">You:</span> Hello, please
                      confirm details.
                    </div>
                    <div>
                      <span className="font-medium">Staff:</span> Working on it.
                    </div>
                  </div>
                </ScrollArea>
                <form className="flex gap-2">
                  <Input placeholder="Type a message…" disabled />
                  <Button type="button" disabled>
                    Send
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
