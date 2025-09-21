import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const autoCancelStaleOrders = internalMutation({
  args: { thresholdMs: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoff = now - args.thresholdMs;
    const candidates = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "submitted")) // or in_queue in staff panel
      .collect();
    for (const o of candidates) {
      if (o.pickedByStaffUserId) continue;
      if (o.createdAt <= cutoff) {
        await ctx.db.patch(o._id, {
          status: "cancelled",
          updatedAt: now,
          autoCancelAt: now,
        });
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
  internal.crons.autoCancelStaleOrders,
  { thresholdMs: 10 * 60 * 1000 },
);

export const cleanupOldChats = internalMutation({
  args: { olderThanMs: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoff = now - args.olderThanMs;

    // Find orders older than cutoff
    const oldOrders = ctx.db
      .query("orders")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .order("asc");

    for await (const order of oldOrders) {
      // Find chats for this order
      const chats = await ctx.db
        .query("chats")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();

      for (const chat of chats) {
        // Delete messages in this chat
        const messagesIt = ctx.db
          .query("messages")
          .withIndex("by_chat", (q) => q.eq("chatId", chat._id))
          .order("asc");

        for await (const msg of messagesIt) {
          // Delete attached files for the message (both storage and file docs)
          const fileIds = msg.attachmentFileIds ?? [];
          for (const fileId of fileIds) {
            const fileDoc = await ctx.db.get(fileId);
            if (fileDoc) {
              // Delete blob from storage first
              await ctx.storage.delete(fileDoc.storageId);
              // Delete file metadata row
              await ctx.db.delete(fileDoc._id);
            }
          }
          // Delete the message document
          await ctx.db.delete(msg._id);
        }
        // Keep chat document; only messages and their files are cleared
      }
    }

    return null;
  },
});

crons.interval(
  "daily: cleanup chat logs/files older than 20 days",
  { hours: 24 },
  internal.crons.cleanupOldChats,
  { olderThanMs: 20 * 24 * 60 * 60 * 1000 },
);

export default crons;




