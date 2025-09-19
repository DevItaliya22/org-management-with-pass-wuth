"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRole } from "@/hooks/use-role";
import Link from "next/link";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export default function OrdersPage() {
  const { isLoading, isResellerAdmin, session } = useRole();

  // Single role-aware query handled on the backend
  const page = useQuery(api.orders.listOrdersForViewer, {
    paginationOpts: { numItems: 20, cursor: null },
  });
  const userIds: string[] = Array.from(
    new Set((page?.page ?? []).map((o: any) => o.createdByUserId)),
  );
  const userLabels = useQuery(
    api.orders.getUserLabels,
    userIds.length ? ({ userIds } as any) : ("skip" as any),
  );

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (page === undefined) return <div className="p-4">Loading…</div>;
  if (page === null) return <div className="p-4">Not authorized</div>;

  return (
    <DashboardLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Orders</h1>
        </div>

        {page.page && page.page.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              All Orders
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[26%]">Merchant / Customer</TableHead>
                  <TableHead className="w-[16%]">Status</TableHead>
                  <TableHead className="w-[16%]">Value (USD)</TableHead>
                  <TableHead className="w-[12%]">SLA</TableHead>
                  <TableHead className="w-[18%]">Created</TableHead>
                  <TableHead className="text-right w-[12%]">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.page.map((o: any) => (
                  <TableRow key={o._id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="truncate">{o.merchant}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {o.customerName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          "text-xs px-2 py-0.5 rounded border " +
                          (o.status === "submitted"
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900"
                            : o.status === "picked"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900"
                              : o.status === "in_progress"
                                ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:border-violet-900"
                                : o.status === "on_hold"
                                  ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-900"
                                  : o.status === "fulfil_submitted"
                                    ? "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-200 dark:border-cyan-900"
                                    : o.status === "completed"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900"
                                      : o.status === "disputed"
                                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900"
                                        : o.status === "cancelled"
                                          ? "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-800"
                                          : "")
                        }
                      >
                        {o.status}
                      </span>
                      {o.status === "cancelled" && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {o.autoCancelAt
                            ? `Auto-cancelled at ${new Date(o.autoCancelAt).toLocaleString()}`
                            : "Cancelled (all staff passed)"}
                        </div>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Created by{" "}
                        {o.createdByUserId === (session?.user?._id as any)
                          ? "you"
                          : userLabels && userLabels[o.createdByUserId]
                            ? (userLabels[o.createdByUserId].name ??
                              userLabels[o.createdByUserId].email)
                            : "member"}
                      </div>
                    </TableCell>
                    <TableCell>${o.cartValueUsd}</TableCell>
                    <TableCell className="uppercase">{o.sla}</TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        aria-label="Open order"
                      >
                        <Link href={`/orders/${o._id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border rounded-md py-12 text-center text-muted-foreground">
            <Inbox className="h-8 w-8 mb-2" />
            <div>No orders found</div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
