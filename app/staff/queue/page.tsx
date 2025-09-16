"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";

export default function StaffQueuePage() {
  const { isLoading, isStaff } = useRole();
  const queue = useQuery(api.orders.staffInQueue, { paginationOpts: { numItems: 50, cursor: null } });
  const myWork = useQuery(api.orders.listMyWork, { paginationOpts: { numItems: 50, cursor: null } });

  const pick = useMutation(api.orders.pickOrder);
  const pass = useMutation(api.orders.passOrder);
  const start = useMutation(api.orders.moveToInProgress);
  const hold = useMutation(api.orders.holdOrder);
  const resume = useMutation(api.orders.resumeOrder);

  // Drag & Drop (HTML5) state
  const handleDragStart = (e: React.DragEvent, orderId: string, lane: string) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ orderId, lane }));
    e.dataTransfer.effectAllowed = "move";
  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetLane: "queue" | "in_progress" | "on_hold" | "fulfil_submitted") => {
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
  if (!isStaff) return <div className="p-4">Not authorized</div>;

  const myOrders = myWork?.page ?? [];
  const inProgress = myOrders.filter((o: any) => o.status === "picked" || o.status === "in_progress");
  const onHold = myOrders.filter((o: any) => o.status === "on_hold");
  const fulfilSubmitted = myOrders.filter((o: any) => o.status === "fulfil_submitted");

  return (
    <DashboardLayout>
    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* In Queue */}
      <Card className="flex flex-col" onDragOver={allowDrop} onDrop={(e) => handleDrop(e, "queue")}> 
        <CardHeader>
          <CardTitle>In Queue</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <ScrollArea className="h-[70vh] pr-2">
            <div className="space-y-3">
              {queue?.page?.map((o: any) => (
                <div
                  key={o._id}
                  className="rounded border p-3 bg-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, o._id, "queue")}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{o.merchant}</div>
                    <Badge variant="secondary">${o.cartValueUsd}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{o.customerName} • {o.sla}</div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => pick({ orderId: o._id })}>Pick</Button>
                    <Button size="sm" variant="outline" onClick={() => pass({ orderId: o._id, reason: "Not suitable" })}>Pass</Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* In Progress */}
      <Card className="flex flex-col" onDragOver={allowDrop} onDrop={(e) => handleDrop(e, "in_progress")}>
        <CardHeader>
          <CardTitle>In Progress</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <ScrollArea className="h-[70vh] pr-2">
            <div className="space-y-3">
              {inProgress.map((o: any) => (
                <div
                  key={o._id}
                  className="rounded border p-3 bg-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, o._id, "in_progress")}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{o.merchant}</div>
                    <Badge>${o.cartValueUsd}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{o.customerName} • {o.sla}</div>
                  <div className="mt-2 flex gap-2">
                    {o.status === "picked" && (
                      <Button size="sm" onClick={() => start({ orderId: o._id })}>Start</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => hold({ orderId: o._id, reason: "Waiting for info" })}>Hold</Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* On Hold */}
      <Card className="flex flex-col" onDragOver={allowDrop} onDrop={(e) => handleDrop(e, "on_hold")}>
        <CardHeader>
          <CardTitle>On Hold</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <ScrollArea className="h-[70vh] pr-2">
            <div className="space-y-3">
              {onHold.map((o: any) => (
                <div
                  key={o._id}
                  className="rounded border p-3 bg-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, o._id, "on_hold")}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{o.merchant}</div>
                    <Badge>${o.cartValueUsd}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{o.customerName} • {o.sla}</div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => resume({ orderId: o._id })}>Resume</Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Fulfilment Submitted */}
      <Card className="flex flex-col" onDragOver={allowDrop} onDrop={(e) => handleDrop(e, "fulfil_submitted")}>
        <CardHeader>
          <CardTitle>Fulfilment Submitted</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <ScrollArea className="h-[70vh] pr-2">
            <div className="space-y-3">
              {fulfilSubmitted.map((o: any) => (
                <div
                  key={o._id}
                  className="rounded border p-3 bg-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, o._id, "fulfil_submitted")}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{o.merchant}</div>
                    <Badge>${o.cartValueUsd}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{o.customerName} • {o.sla}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}


