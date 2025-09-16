"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRole } from "@/hooks/use-role";
import Link from "next/link";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";

export default function OrdersPage() {
  const { isLoading, isResellerAdmin, session } = useRole();

  // Single role-aware query handled on the backend
  const page = useQuery(api.orders.listOrdersForViewer, { paginationOpts: { numItems: 20, cursor: null } });
  const userIds: string[] = isResellerAdmin
    ? Array.from(new Set((page?.page ?? []).map((o: any) => o.createdByUserId)))
    : [];
  const userLabels = useQuery(api.orders.getUserLabels, { userIds } as any);

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (page === undefined) return <div className="p-4">Loading…</div>;
  if (page === null) return <div className="p-4">Not authorized</div>;

  return (
    <DashboardLayout>
      <div className="p-4 space-y-3">
        <h1 className="text-xl font-semibold">Orders</h1>
        <ul className="divide-y divide-border rounded-md border bg-card">
          {page.page?.map((o: any) => (
            <li key={o._id} className="p-3 hover:bg-muted/50">
              <Link href={`/orders/${o._id}`} className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{o.merchant} – {o.customerName}</div>
                  <div className="text-sm text-muted-foreground">
                    {o.status} • ${o.cartValueUsd} • {o.sla}
                    {isResellerAdmin && (
                      <>
                        {" "}• by {o.createdByUserId === (session?.user?._id as any)
                          ? "you"
                          : (userLabels && userLabels[o.createdByUserId]
                              ? (userLabels[o.createdByUserId].name ?? userLabels[o.createdByUserId].email)
                              : "member")}
                      </>
                    )}
                  </div>
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


