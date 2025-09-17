"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/ui/shadcn-io/kanban";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { notFound } from "next/navigation";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";

export default function StaffQueuePage() {
  const { isLoading, isStaff } = useRole();
  const queue = useQuery(
    api.orders.staffInQueue,
    isLoading
      ? (undefined as any)
      : { paginationOpts: { numItems: 50, cursor: null } },
  );
  const myWork = useQuery(
    api.orders.listMyWork,
    isLoading
      ? (undefined as any)
      : { paginationOpts: { numItems: 50, cursor: null } },
  );

  const pick = useMutation(api.orders.pickOrder);
  const pass = useMutation(api.orders.passOrder);
  const start = useMutation(api.orders.moveToInProgress);
  const hold = useMutation(api.orders.holdOrder);
  const resume = useMutation(api.orders.resumeOrder);
  const submitFulfilment = useMutation(api.orders.submitFulfilment);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    id: string;
    from: string;
    to: string;
  } | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [merchantLink, setMerchantLink] = useState("");
  const [nameOnOrder, setNameOnOrder] = useState("");
  const [finalValueUsd, setFinalValueUsd] = useState("");
  const [passOpen, setPassOpen] = useState(false);
  const [passReason, setPassReason] = useState("");

  // Drag & Drop (HTML5) state
  const handleDragStart = (
    e: React.DragEvent,
    orderId: string,
    lane: string,
  ) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ orderId, lane }));
    e.dataTransfer.effectAllowed = "move";
  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetLane: "queue" | "in_progress" | "on_hold" | "fulfil_submitted",
  ) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const { orderId, lane } = JSON.parse(raw || "{}");
    if (!orderId) return;

    try {
      // Disallow moving back to queue or into fulfil_submitted via drag
      if (targetLane === "queue" || targetLane === "fulfil_submitted") return;

      if (lane === "queue" && targetLane === "in_progress") {
        await pick({ orderId });
        await start({ orderId });
        return;
      }
      if (lane === "queue" && targetLane === "on_hold") {
        await pick({ orderId });
        await hold({ orderId, reason: "Moved to hold" });
        return;
      }
      if (lane === "in_progress" && targetLane === "on_hold") {
        await hold({ orderId, reason: "Moved to hold" });
        return;
      }
      if (lane === "on_hold" && targetLane === "in_progress") {
        await resume({ orderId });
        return;
      }
    } catch (err) {
      console.error("Drag drop action failed", err);
    }
  };

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (!isStaff) return notFound();

  const myOrders = myWork?.page ?? [];
  const columns = [
    { id: "queue", name: "In Queue" },
    { id: "in_progress", name: "In Progress" },
    { id: "on_hold", name: "On Hold" },
    { id: "fulfil_submitted", name: "Fulfilment Submitted" },
  ];
  const data = [
    ...(queue?.page ?? []).map((o: any) => ({
      id: o._id,
      name: `${o.merchant} – ${o.customerName}`,
      column: "queue",
      _raw: o,
    })),
    ...myOrders.map((o: any) => ({
      id: o._id,
      name: `${o.merchant} – ${o.customerName}`,
      column: o.status === "picked" ? "in_progress" : o.status,
      _raw: o,
    })),
  ];

  return (
    <DashboardLayout>
      <div className="p-4">
        <KanbanProvider
          columns={columns}
          data={data}
          className="grid-cols-1 md:grid-cols-4"
          onDragEnd={async (evt) => {
            const { active, over } = evt;
            if (!over) return;
            const from = data.find((d: any) => d.id === active.id)?.column;
            const to = columns.find((c) => c.id === (over.id as string))?.id;
            if (!from || !to || from === to) return;
            setPendingMove({ id: active.id as string, from, to });
            setConfirmOpen(true);
          }}
        >
          {(col) => (
            <KanbanBoard id={col.id} key={col.id}>
              <KanbanHeader>{col.name}</KanbanHeader>
              <KanbanCards id={col.id}>
                {(item: any) => (
                  <KanbanCard id={item.id} name={item.name} column={col.id}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm truncate">
                        {item._raw?.merchant}
                      </div>
                      <Badge
                        variant={col.id === "queue" ? "secondary" : "default"}
                      >
                        ${item._raw?.cartValueUsd}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item._raw?.customerName} • {item._raw?.sla}
                    </div>
                  </KanbanCard>
                )}
              </KanbanCards>
            </KanbanBoard>
          )}
        </KanbanProvider>
        <AlertDialog
          open={confirmOpen}
          onOpenChange={(open) => {
            setConfirmOpen(open);
            if (!open) {
              setPendingMove(null);
              setHoldReason("");
              setMerchantLink("");
              setNameOnOrder("");
              setFinalValueUsd("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm move</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingMove
                  ? `Move order from "${columns.find((c) => c.id === pendingMove.from)?.name}" to "${columns.find((c) => c.id === pendingMove.to)?.name}"`
                  : ""}
              </AlertDialogDescription>
              {pendingMove?.to === "on_hold" && (
                <div className="mt-3 space-y-2">
                  <Label>Reason</Label>
                  <Input
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    placeholder="Enter reason for hold"
                  />
                </div>
              )}
              {pendingMove?.to === "fulfil_submitted" && (
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label>Merchant Link</Label>
                    <Input
                      value={merchantLink}
                      onChange={(e) => setMerchantLink(e.target.value)}
                      placeholder="https://merchant.com/order"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name on Order</Label>
                    <Input
                      value={nameOnOrder}
                      onChange={(e) => setNameOnOrder(e.target.value)}
                      placeholder="Exact name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Final Value Charged (USD)</Label>
                    <Input
                      value={finalValueUsd}
                      onChange={(e) => setFinalValueUsd(e.target.value)}
                      placeholder="e.g. 120"
                    />
                  </div>
                </div>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingMove(null)}>
                Cancel
              </AlertDialogCancel>
              {pendingMove?.from === "queue" && pendingMove?.to === "in_progress" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmOpen(false);
                    setPassOpen(true);
                  }}
                >
                  Pass
                </Button>
              )}
              <AlertDialogAction
                onClick={async () => {
                  if (!pendingMove) return;
                  const { id, from, to } = pendingMove;
                  try {
                    if (from === "queue" && to === "in_progress") {
                      await pick({ orderId: id as any });
                      await start({ orderId: id as any });
                    } else if (from === "queue" && to === "on_hold") {
                      if (!holdReason.trim()) return;
                      await pick({ orderId: id as any });
                      await hold({
                        orderId: id as any,
                        reason: holdReason.trim(),
                      });
                    } else if (from === "in_progress" && to === "on_hold") {
                      if (!holdReason.trim()) return;
                      await hold({
                        orderId: id as any,
                        reason: holdReason.trim(),
                      });
                    } else if (from === "on_hold" && to === "in_progress") {
                      await resume({ orderId: id as any });
                    } else if (
                      from === "in_progress" &&
                      to === "fulfil_submitted"
                    ) {
                      const finalVal = parseFloat(finalValueUsd);
                      if (
                        !merchantLink.trim() ||
                        !nameOnOrder.trim() ||
                        isNaN(finalVal)
                      )
                        return;
                      await submitFulfilment({
                        orderId: id as any,
                        merchantLink: merchantLink.trim(),
                        nameOnOrder: nameOnOrder.trim(),
                        finalValueUsd: finalVal,
                        proofFileIds: [],
                      });
                    } else if (
                      from === "on_hold" &&
                      to === "fulfil_submitted"
                    ) {
                      const finalVal = parseFloat(finalValueUsd);
                      if (
                        !merchantLink.trim() ||
                        !nameOnOrder.trim() ||
                        isNaN(finalVal)
                      )
                        return;
                      await submitFulfilment({
                        orderId: id as any,
                        merchantLink: merchantLink.trim(),
                        nameOnOrder: nameOnOrder.trim(),
                        finalValueUsd: finalVal,
                        proofFileIds: [],
                      });
                    }
                  } finally {
                    setPendingMove(null);
                    setHoldReason("");
                    setMerchantLink("");
                    setNameOnOrder("");
                    setFinalValueUsd("");
                  }
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Pass-only modal */}
        <AlertDialog
          open={passOpen}
          onOpenChange={(open) => {
            setPassOpen(open);
            if (!open) {
              setPassReason("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Pass order</AlertDialogTitle>
              <AlertDialogDescription>
                Please provide a reason for passing this order.
              </AlertDialogDescription>
              <div className="mt-3 space-y-2">
                <Label>Reason</Label>
                <Input
                  value={passReason}
                  onChange={(e) => setPassReason(e.target.value)}
                  placeholder="Enter reason for pass"
                />
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setPassOpen(false);
                  setPassReason("");
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!passReason.trim()}
                onClick={async () => {
                  try {
                    if (!pendingMove?.id) return;
                    await pass({ orderId: pendingMove.id as any, reason: passReason.trim() });
                  } finally {
                    setPassOpen(false);
                    setPassReason("");
                    setPendingMove(null);
                  }
                }}
              >
                Confirm Pass
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
