import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const autoCancelStaleOrders = internalMutation({
  args: { thresholdMs: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoff = now - args.thresholdMs;
    const candidates = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();
    for (const o of candidates) {
      if (o.pickedByStaffUserId) continue;
      if (o.createdAt <= cutoff) {
        await ctx.db.patch(o._id, { status: "cancelled", updatedAt: now });
        await ctx.db.insert("auditLogs", {
          actorUserId: o.createdByUserId,
          entity: "order",
          entityId: String(o._id),
          action: "order_auto_cancelled",
          orderId: o._id,
          createdAt: now,
        });
      }
    }
    return null;
  },
});

const crons = cronJobs();

crons.interval(
  "auto cancel submitted > 10m",
  { minutes: 1 },
  internal.cron.autoCancelStaleOrders,
  { thresholdMs: 10 * 60 * 1000 },
);

export default crons;


