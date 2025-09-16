"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useRole } from "@/hooks/use-role";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function OwnerDisputesPage() {
  const { isLoading, isOwner } = useRole();
  const disputesByOrder = useQuery(api.orders.listOrdersForOwner, {
    paginationOpts: { numItems: 100, cursor: null },
    status: "disputed" as any,
    teamId: undefined,
    categoryId: undefined,
  });

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (!isOwner) return <div className="p-4">Not authorized</div>;
  if (disputesByOrder === undefined) return <div className="p-4">Loading…</div>;

  return (
    <DashboardLayout>
      <div className="p-4 space-y-3">
        <h1 className="text-xl font-semibold">Disputed Orders</h1>
        <ul className="divide-y divide-border rounded-md border bg-card">
          {disputesByOrder.page?.map((o: any) => (
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
        </ul>
      </div>
    </DashboardLayout>
  );
}


