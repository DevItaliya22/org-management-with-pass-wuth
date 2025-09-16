"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params?.orderId as string | undefined;

  const order = useQuery(api.orders.getOrderById, orderId ? { orderId } as any : "skip");

  if (order === undefined) return <div className="p-4">Loading…</div>;
  if (order === null) return <div className="p-4">Order not found or not authorized</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Order #{order._id}</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <div className="font-medium">Customer</div>
          <div>{order.customerName}</div>
          <div className="text-muted-foreground text-sm">{order.country}, {order.city}</div>
          {order.contact && <div className="text-sm">{order.contact}</div>}
        </div>
        <div className="space-y-1">
          <div className="font-medium">Order</div>
          <div>Merchant: {order.merchant}</div>
          <div>Value: ${order.cartValueUsd}</div>
          <div>Status: {order.status}</div>
          <div>SLA: {order.sla}</div>
        </div>
      </div>
    </div>
  );
}


