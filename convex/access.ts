import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

export const getViewerOrThrow = internalQuery({
  args: {},
  returns: v.object({
    user: v.object({
      _id: v.id("users"),
      role: v.optional(
        v.union(v.literal("owner"), v.literal("reseller"), v.literal("staff")),
      ),
    }),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return {
      user: { _id: user._id, role: user.role },
    };
  },
});

export const getUserTeams = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      teamId: v.id("teams"),
      role: v.union(v.literal("admin"), v.literal("member")),
    }),
  ),
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return memberships
      .filter(
        (m) =>
          m.isActive &&
          !m.isBlocked &&
          (m.role === "admin" || m.role === "member"),
      )
      .map((m) => ({ teamId: m.teamId, role: m.role }));
  },
});

export const canReadOrder = internalQuery({
  args: { userId: v.id("users"), orderId: v.id("orders") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return false;

    // Owner can read everything
    if (user.role === "owner") return true;

    const order = await ctx.db.get(args.orderId);
    if (!order) return false;

    // Creator can read
    if (order.createdByUserId === args.userId) return true;

    // Staff can read orders they picked
    if (user.role === "staff" && order.pickedByStaffUserId === args.userId)
      return true;
    
    // Staff can also read submitted orders (in queue) if they haven't passed them yet
    if (user.role === "staff" && order.status === "submitted" && !order.pickedByStaffUserId) {
      const hasPassed = order.orderPassedByUserId?.some((p: any) => p.userId === args.userId);
      if (!hasPassed) return true;
    }

    // Reseller admin can read all orders in their teams
    if (user.role === "reseller") {
      const memberships = await ctx.db
        .query("resellerMembers")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      const isAdminForTeam = memberships.some(
        (m: any) =>
          m.teamId === order.teamId &&
          m.role === "admin" &&
          m.isActive &&
          !m.isBlocked,
      );
      if (isAdminForTeam) return true;
      // Members only their own orders (already covered by creator check)
    }

    return false;
  },
});
