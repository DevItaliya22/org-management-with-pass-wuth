"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import OrderChat from "@/components/OrderChat";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, File, ChevronDown, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import RaiseDisputeDialog from "./RaiseDisputeDialog";

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
  const session = useQuery(api.session.getCurrentUserSession, {});
  const currentUserId = session?.user?._id as string | undefined;
  const currentUserRole = session?.user?.role as
    | "owner"
    | "staff"
    | "reseller"
    | undefined;
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

  // Determine if current user is reseller admin of the order's team
  const myTeamRole = useQuery(
    api.orders.getUserTeamRoles,
    order && currentUserId && currentUserRole === "reseller"
      ? ({
          teamId: order.teamId as any,
          userIds: [currentUserId] as any,
        } as any)
      : ("skip" as any),
  );

  const completeOrder = useMutation(api.orders.completeOrder);
  const raiseDispute = useMutation(api.orders.raiseDispute);
  const fixAndCompleteDispute = useMutation(api.orders.fixAndCompleteDispute);
  const declineAndCompleteDispute = useMutation(
    api.orders.declineAndCompleteDispute,
  );
  const partialRefundAndCompleteDispute = useMutation(
    api.orders.partialRefundAndCompleteDispute,
  );

  const [completing, setCompleting] = useState(false);
  // Dispute raise state moved into RaiseDisputeButton to avoid extra rerenders
  const [disputeActionOpen, setDisputeActionOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [activeAction, setActiveAction] = useState<
    "fix" | "decline" | "partial" | null
  >(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Removed dispute file helpers; handled in RaiseDisputeButton

  const handleDisputeAction = (
    dispute: any,
    action: "fix" | "decline" | "partial",
  ) => {
    setSelectedDispute(dispute);
    setActiveAction(action);
    setResolutionNotes("");
    setAdjustmentAmount("");
    setDisputeActionOpen(true);
  };

  const submitDisputeAction = async () => {
    if (!selectedDispute || !activeAction) return;

    setSubmitting(true);
    try {
      switch (activeAction) {
        case "fix":
          await fixAndCompleteDispute({
            disputeId: selectedDispute._id,
            resolutionNotes: resolutionNotes.trim() || undefined,
          });
          break;
        case "decline":
          await declineAndCompleteDispute({
            disputeId: selectedDispute._id,
            resolutionNotes: resolutionNotes.trim(),
          });
          break;
        case "partial":
          await partialRefundAndCompleteDispute({
            disputeId: selectedDispute._id,
            adjustmentAmountUsd: parseFloat(adjustmentAmount),
            resolutionNotes: resolutionNotes.trim() || undefined,
          });
          break;
      }

      setDisputeActionOpen(false);
      setSelectedDispute(null);
      setActiveAction(null);
      setResolutionNotes("");
      setAdjustmentAmount("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const getActionTitle = () => {
    switch (activeAction) {
      case "fix":
        return "Fix & Complete";
      case "decline":
        return "Decline & Complete";
      case "partial":
        return "Partial Refund/Credit";
      default:
        return "";
    }
  };

  const getActionDescription = () => {
    switch (activeAction) {
      case "fix":
        return "Mark this dispute as resolved with no monetary adjustment.";
      case "decline":
        return "Decline this dispute and mark it as resolved.";
      case "partial":
        return "Provide a partial refund/credit and mark the dispute as resolved.";
      default:
        return "";
    }
  };

  const isActionValid = () => {
    if (activeAction === "decline") {
      return resolutionNotes.trim().length > 0;
    }
    if (activeAction === "partial") {
      const amount = parseFloat(adjustmentAmount);
      return amount > 0;
    }
    return true;
  };

  const getDisputeDecisionLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "Fixed & Completed";
      case "declined":
        return "Declined & Completed";
      case "partial_refund":
        return "Partial Refund/Credit";
      case "resolved":
        return "Resolved";
      case "open":
      default:
        return "Open";
    }
  };

  const getDisputeBadgeClass = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border border-green-200";
      case "declined":
        return "bg-red-100 text-red-800 border border-red-200";
      case "partial_refund":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "open":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "resolved":
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  if (!ready || order === undefined) return <div className="p-4">Loading…</div>;
  if (!allowed) return notFound();
  if (order === null)
    return (
      <div className="p-6 min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Access changed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                This order is no longer available. It may have been picked by another staff member or your access has changed.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isStaff && (
                <Button size="sm" onClick={() => router.push("/staff/queue")}>Back to Queue</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => router.back()}>Go Back</Button>
              <Button size="sm" variant="ghost" onClick={() => router.refresh()}>Refresh</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );

  const canWriteToChat = !!(
    isOwner ||
    isReseller ||
    isStaff ||
    isResellerAdmin
  );

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
            <RaiseDisputeDialog orderId={order._id} />
          </div>
        )}

        {/* Dispute Action Dialog */}
        <Dialog open={disputeActionOpen} onOpenChange={setDisputeActionOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{getActionTitle()}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedDispute && (
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Dispute Reason:</span>
                    <p className="text-muted-foreground mt-1">
                      {selectedDispute.reason}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Raised by:{" "}
                    {disputeUserLabels?.[selectedDispute.raisedByUserId]
                      ?.name ??
                      disputeUserLabels?.[selectedDispute.raisedByUserId]
                        ?.email ??
                      "User"}
                    {disputeRoles?.[selectedDispute.raisedByUserId] &&
                      ` (${disputeRoles[selectedDispute.raisedByUserId]})`}
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                {getActionDescription()}
              </div>

              {activeAction === "partial" && (
                <div className="space-y-2">
                  <Label
                    htmlFor="adjustment-amount"
                    className="text-sm font-medium"
                  >
                    Adjustment Amount (USD) *
                  </Label>
                  <Input
                    id="adjustment-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="resolution-notes"
                  className="text-sm font-medium"
                >
                  Resolution Notes{" "}
                  {activeAction === "decline" ? "*" : "(Optional)"}
                </Label>
                <Textarea
                  id="resolution-notes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={
                    activeAction === "decline"
                      ? "Please explain why this dispute is being declined..."
                      : "Add any additional notes about the resolution..."
                  }
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDisputeActionOpen(false);
                  setSelectedDispute(null);
                  setActiveAction(null);
                  setResolutionNotes("");
                  setAdjustmentAmount("");
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                disabled={!isActionValid() || submitting}
                onClick={submitDisputeAction}
              >
                {submitting ? "Processing..." : "Confirm"}
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
              {(isOwner || isResellerAdmin) && orderId && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Access Permissions</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {isOwner && (
                      <OwnerPermissions orderId={orderId} order={order} />
                    )}
                    {isResellerAdmin && (
                      <ResellerAdminPermissions orderId={orderId} order={order} />
                    )}
                  </div>
                  <Separator />
                </div>
              )}
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
                  {order.status === "cancelled" && (
                    <>
                      <span className="text-muted-foreground">Cancellation</span>
                      <span className="col-span-2 text-sm text-muted-foreground">
                        {order.autoCancelAt
                          ? `Auto-cancelled at ${new Date(order.autoCancelAt).toLocaleString()}`
                          : "Cancelled (all staff passed)"}
                      </span>
                    </>
                  )}
                  
                  {order.status === "on_hold" && order.holdReason && (
                    <>
                      <span className="text-muted-foreground">Hold Reason</span>
                      <span className="col-span-2 break-words">
                        {order.holdReason}
                      </span>
                    </>
                  )}
                  {order.currencyOverride && (
                    <>
                      <span className="text-muted-foreground">Currency</span>
                      <span className="col-span-2">
                        {order.currencyOverride}
                      </span>
                    </>
                  )}
                  {order.timeWindow && (
                    <>
                      <span className="text-muted-foreground">Time Window</span>
                      <span className="col-span-2">{order.timeWindow}</span>
                    </>
                  )}
                  {order.itemsSummary && (
                    <>
                      <span className="text-muted-foreground">
                        Items Summary
                      </span>
                      <span className="col-span-2 break-words">
                        {order.itemsSummary}
                      </span>
                    </>
                  )}
                </div>
              </section>

              {/* Address Information Section */}
              {(order.pickupAddress || order.deliveryAddress) && (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h3 className="font-medium text-sm">Address Information</h3>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {order.pickupAddress && (
                        <>
                          <span className="text-muted-foreground">
                            Pickup Address
                          </span>
                          <span className="col-span-2 break-words">
                            {order.pickupAddress}
                          </span>
                        </>
                      )}
                      {order.deliveryAddress && (
                        <>
                          <span className="text-muted-foreground">
                            Delivery Address
                          </span>
                          <span className="col-span-2 break-words">
                            {order.deliveryAddress}
                          </span>
                        </>
                      )}
                    </div>
                  </section>
                </>
              )}

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

                    {order.fulfilment.proofFileIds &&
                      order.fulfilment.proofFileIds.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <h4 className="font-medium text-sm">
                            Fulfilment Proof
                          </h4>
                          <div className="space-y-2">
                            {order.fulfilment.proofFileIds.map(
                              (fileId: any) => (
                                <AttachmentFile key={fileId} fileId={fileId} />
                              ),
                            )}
                          </div>
                        </div>
                      )}
                  </section>
                </>
              )}

              {/* Billing Information Section */}
              {order.billing && (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h3 className="font-medium text-sm">Billing Information</h3>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-muted-foreground">Rate %</span>
                      <span className="col-span-2 font-medium">
                        {order.billing.ratePercent}%
                      </span>
                      <span className="text-muted-foreground">Floor (USD)</span>
                      <span className="col-span-2">
                        ${order.billing.floorUsd}
                      </span>
                      <span className="text-muted-foreground">
                        Base Value (USD)
                      </span>
                      <span className="col-span-2">
                        ${order.billing.baseValueUsd}
                      </span>
                      <span className="text-muted-foreground">
                        Billed (USD)
                      </span>
                      <span className="col-span-2 font-medium">
                        ${order.billing.billedUsd}
                      </span>
                    </div>
                  </section>
                </>
              )}

              {/* Attachments Section */}
              {order.attachmentFileIds &&
                order.attachmentFileIds.length > 0 && (
                  <>
                    <Separator />
                    <section className="space-y-2">
                      <h3 className="font-medium text-sm">Attachments</h3>
                      <div className="space-y-2">
                        {order.attachmentFileIds.map((fileId: any) => (
                          <AttachmentFile key={fileId} fileId={fileId} />
                        ))}
                      </div>
                    </section>
                  </>
                )}

              {disputes && disputes.length > 0 && (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h3 className="font-medium text-sm">Disputes</h3>
                    <div className="space-y-2">
                      {disputes.map((d: any) => (
                        <div
                          key={d._id}
                          className="rounded border p-3 text-sm space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              <Badge
                                className={`${getDisputeBadgeClass(d.status)} px-2 py-0.5 text-xs font-medium`}
                              >
                                {getDisputeDecisionLabel(d.status)}
                              </Badge>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(d.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div>Reason: {d.reason}</div>
                          <div className="text-xs text-muted-foreground">
                            Raised by:{" "}
                            {disputeUserLabels?.[d.raisedByUserId]?.name ??
                              disputeUserLabels?.[d.raisedByUserId]?.email ??
                              "User"}
                            {disputeRoles?.[d.raisedByUserId] &&
                              ` (${disputeRoles[d.raisedByUserId]})`}
                          </div>
                          {typeof d.adjustmentAmountUsd === "number" &&
                            d.status === "partial_refund" && (
                              <div>
                                <span className="text-muted-foreground">
                                  Adjustment Amount:
                                </span>{" "}
                                <span className="font-medium">
                                  ${d.adjustmentAmountUsd}
                                </span>
                              </div>
                            )}
                          {d.resolutionNotes && (
                            <div>Notes: {d.resolutionNotes}</div>
                          )}

                          {d.attachmentFileIds &&
                            d.attachmentFileIds.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-muted-foreground">
                                  Dispute Attachments
                                </div>
                                <div className="space-y-2">
                                  {d.attachmentFileIds.map((fileId: any) => (
                                    <AttachmentFile
                                      key={fileId}
                                      fileId={fileId}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                          {/* Owner Action Dropdown */}
                          {isOwner && d.status === "open" && (
                            <div className="pt-3 border-t border-border/50">
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                Owner Actions:
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-8 px-3"
                                  >
                                    Take Action
                                    <ChevronDown className="h-3 w-3 ml-1" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="start"
                                  className="w-48"
                                >
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDisputeAction(d, "fix")
                                    }
                                    className="text-green-700 focus:text-green-700 focus:bg-green-50"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        Fix & Complete
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Resolve with no adjustment
                                      </span>
                                    </div>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDisputeAction(d, "decline")
                                    }
                                    className="text-red-700 focus:text-red-700 focus:bg-red-50"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        Decline & Complete
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Decline the dispute
                                      </span>
                                    </div>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDisputeAction(d, "partial")
                                    }
                                    className="text-blue-700 focus:text-blue-700 focus:bg-blue-50"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        Partial Refund/Credit
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Provide monetary adjustment
                                      </span>
                                    </div>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              
            </CardContent>
          </Card>
          {/* Chat */}
          <div className="order-2 lg:col-span-2 h-[80vh]">
            {orderId && (
              <OrderChat
                orderId={orderId}
                canWrite={canWriteToChat}
                canReadOnly={!canWriteToChat}
                hasDisputes={disputes && disputes.length > 0}
                disputeCount={disputes?.length || 0}
              />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Component to display individual attachment files
function AttachmentFile({ fileId }: { fileId: string }) {
  const file = useQuery(api.files.getFileById, { fileId: fileId as any });
  const [showImage, setShowImage] = useState(false);

  if (!file) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md text-sm">
        <File className="h-4 w-4 text-gray-500" />
        <span className="text-muted-foreground">Loading file...</span>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isImage = (filename: string) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
    return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
  };

  const handleViewFile = () => {
    if (isImage(file.uiName)) {
      setShowImage(true);
    } else {
      window.open(file.url, "_blank");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md text-sm">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{file.uiName}</div>
            <div className="text-xs text-muted-foreground">
              {formatFileSize(file.sizeBytes)}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewFile}
          className="h-6 px-2 text-xs"
        >
          View
        </Button>
      </div>

      {/* Image Overlay */}
      {isImage(file.uiName) && showImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={file.url}
              alt={file.uiName}
              className="max-w-full max-h-full object-contain rounded-lg"
              onError={(e) => {
                console.error("Failed to load image:", file.url);
                e.currentTarget.style.display = "none";
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImage(false)}
              className="absolute top-2 right-2 bg-red-600 text-white hover:bg-red-700 h-8 w-8 p-0 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
