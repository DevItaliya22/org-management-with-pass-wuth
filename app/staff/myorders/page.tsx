"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useRole } from "@/hooks/use-role";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function StaffMyOrdersPage() {
  const { isLoading, isStaff } = useRole();
  const myWork = useQuery(api.orders.listMyWork, { paginationOpts: { numItems: 100, cursor: null } });

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (!isStaff) return <div className="p-4">Not authorized</div>;

  return (
    <DashboardLayout>
      <div className="p-4 space-y-3">
        <h1 className="text-xl font-semibold">My Orders</h1>
        <ul className="divide-y divide-border rounded-md border bg-card">
          {myWork?.page?.map((o: any) => (
            <li key={o._id} className="p-3 hover:bg-muted/50">
              <Link href={`/orders/${o._id}`} className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{o.merchant} – {o.customerName}</div>
                  <div className="text-sm text-muted-foreground">{o.status} • ${o.cartValueUsd} • {o.sla}</div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
              </Link>
            </li>
          ))}
          {(!myWork || myWork.page?.length === 0) && (
            <li className="p-3 text-sm text-muted-foreground">No orders assigned.</li>
          )}
        </ul>
      </div>
    </DashboardLayout>
  );
}


