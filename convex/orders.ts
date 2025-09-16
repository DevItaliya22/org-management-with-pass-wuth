import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";
// no internal API references here; keep ACL local

// Helper to ensure viewer and load minimal user
async function requireViewer(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  return { userId, user } as { userId: Id<"users">; user: Doc<"users"> };
}

export const createOrder = mutation({
  args: {
    teamId: v.id("teams"),
    categoryId: v.id("categories"),
    cartValueUsd: v.number(),
    merchant: v.string(),
    customerName: v.string(),
    country: v.string(),
    city: v.string(),
    contact: v.optional(v.string()),
    sla: v.union(v.literal("asap"), v.literal("today"), v.literal("24h")),
    attachmentFileIds: v.array(v.id("files")),
    pickupAddress: v.optional(v.string()),
    deliveryAddress: v.optional(v.string()),
    timeWindow: v.optional(v.string()),
    itemsSummary: v.optional(v.string()),
    currencyOverride: v.optional(v.string()),
  },
  returns: v.object({ orderId: v.id("orders") }),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx);

    // Verify membership: reseller admin or member of the team
    const membership = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("teamId"), args.teamId))
      .first();
    if (!membership || membership.status !== "active_member") {
      throw new Error("Not a member of this team or inactive");
    }

    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      teamId: args.teamId,
      createdByUserId: userId,
      pickedByStaffUserId: undefined,
      categoryId: args.categoryId,
      cartValueUsd: args.cartValueUsd,
      merchant: args.merchant,
      customerName: args.customerName,
      country: args.country,
      city: args.city,
      contact: args.contact,
      sla: args.sla,
      attachmentFileIds: args.attachmentFileIds,
      pickupAddress: args.pickupAddress,
      deliveryAddress: args.deliveryAddress,
      timeWindow: args.timeWindow,
      itemsSummary: args.itemsSummary,
      currencyOverride: args.currencyOverride,
      status: "submitted",
      orderPassedByUserId: [],
      holdReason: undefined,
      autoCancelAt: undefined,
      fulfilment: undefined,
      billing: undefined,
      acceptedAt: undefined,
      createdAt: now,
      updatedAt: now,
      readAccessUserIds: [],
      writeAccessUserIds: [],
    });

    // Minimal audit log
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "order",
      entityId: String(orderId),
      action: "order_created",
      metadata: {
        teamId: args.teamId,
        categoryId: args.categoryId,
        cartValueUsd: args.cartValueUsd,
      },
      orderId: orderId,
      createdAt: now,
    });

    return { orderId };
  },
});

export const getOrderById = query({
  args: { orderId: v.id("orders") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    // Local ACL: owner → all; creator → yes; staff → only if picked; reseller admin → team orders
    if (user.role === "owner") return order;
    if (order.createdByUserId === userId) return order;
    if (user.role === "staff" && order.pickedByStaffUserId === userId) return order;
    if (user.role === "reseller") {
      const membership = await ctx.db
        .query("resellerMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .filter((q: any) => q.eq(q.field("teamId"), order.teamId))
        .first();
      if (membership && membership.status === "active_member" && membership.role === "admin") {
        return order;
      }
    }
    throw new Error("Not authorized");
    return order;
  },
});

export const listOrdersForOwner = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(
      v.union(
        v.literal("submitted"),
        v.literal("picked"),
        v.union(v.literal("in_progress"), v.literal("on_hold")),
        v.literal("fulfil_submitted"),
        v.literal("completed"),
        v.literal("disputed"),
        v.literal("cancelled"),
      ),
    ),
    teamId: v.optional(v.id("teams")),
    categoryId: v.optional(v.id("categories")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { user } = await requireViewer(ctx);
    if (user.role !== "owner") throw new Error("Not authorized");

    if (args.teamId) {
      const page = await ctx.db
        .query("orders")
        .withIndex("by_team", (q) => q.eq("teamId", args.teamId!))
        .order("desc")
        .paginate(args.paginationOpts);
      return page;
    }

    if (args.status) {
      const page = await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
      return page;
    }

    if (args.categoryId) {
      const page = await ctx.db
        .query("orders")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
        .order("desc")
        .paginate(args.paginationOpts);
      return page;
    }

    const page = await ctx.db
      .query("orders")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", 0))
      .order("desc")
      .paginate(args.paginationOpts);
    return page;
  },
});

export const listOrdersForReseller = query({
  args: {
    paginationOpts: paginationOptsValidator,
    teamId: v.optional(v.id("teams")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx);
    if (user.role !== "reseller") throw new Error("Not authorized");

    if (args.teamId) {
      // Check admin of the team
      const membership = await ctx.db
        .query("resellerMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .filter((q: any) => q.eq(q.field("teamId"), args.teamId))
        .first();
      if (!membership || membership.status !== "active_member") throw new Error("Not a member");
      const isAdmin = membership.role === "admin";
      if (!isAdmin) {
        // members see only their own
        const page = await ctx.db
          .query("orders")
          .withIndex("by_created_by", (q) => q.eq("createdByUserId", userId))
          .order("desc")
          .paginate(args.paginationOpts);
        return page;
      }
      const page = await ctx.db
        .query("orders")
        .withIndex("by_team", (q) => q.eq("teamId", args.teamId!))
        .order("desc")
        .paginate(args.paginationOpts);
      return page;
    }

    // No team passed: default to own orders
    const page = await ctx.db
      .query("orders")
      .withIndex("by_created_by", (q) => q.eq("createdByUserId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
    return page;
  },
});

export const staffInQueue = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx);
    if (user.role !== "staff") throw new Error("Not authorized");

    const page = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .order("desc")
      .paginate(args.paginationOpts);
    // Filter out those already picked just in case
    page.page = page.page.filter((o: Doc<"orders">) => {
      if (o.pickedByStaffUserId) return false;
      // Exclude if current staff already passed this order
      return !o.orderPassedByUserId?.some((p: any) => p.userId === userId);
    });
    return page;
  },
});

export const listMyWork = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx);
    if (user.role !== "staff") throw new Error("Not authorized");
    const page = await ctx.db
      .query("orders")
      .withIndex("by_picked_by", (q) => q.eq("pickedByStaffUserId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
    return page;
  },
});

export const listActiveCategories = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const cats = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return cats;
  },
});

export const listAllCategories = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const { user } = await requireViewer(ctx);
    if (user.role !== "owner") throw new Error("Not authorized");
    const cats = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.gte("slug", ""))
      .collect();
    return cats;
  },
});

export const createCategory = mutation({
  args: { name: v.string(), slug: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireViewer(ctx);
    if (user.role !== "owner") throw new Error("Not authorized");
    const now = Date.now();
    await ctx.db.insert("categories", {
      name: args.name,
      slug: args.slug,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const toggleCategoryActive = mutation({
  args: { categoryId: v.id("categories"), isActive: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireViewer(ctx);
    if (user.role !== "owner") throw new Error("Not authorized");
    const cat = await ctx.db.get(args.categoryId);
    if (!cat) throw new Error("Category not found");
    await ctx.db.patch(args.categoryId, { isActive: args.isActive, updatedAt: Date.now() });
    return null;
  },
});

export const updateCategory = mutation({
  args: { categoryId: v.id("categories"), name: v.string(), slug: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireViewer(ctx);
    if (user.role !== "owner") throw new Error("Not authorized");
    const cat = await ctx.db.get(args.categoryId);
    if (!cat) throw new Error("Category not found");
    await ctx.db.patch(args.categoryId, { name: args.name, slug: args.slug, updatedAt: Date.now() });
    return null;
  },
});

export const pickOrder = mutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx);
    if (user.role !== "staff") throw new Error("Not authorized");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "submitted") throw new Error("Order not in queue");
    if (order.pickedByStaffUserId) throw new Error("Already picked");

    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      pickedByStaffUserId: userId,
      status: "picked",
      acceptedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "order",
      entityId: String(args.orderId),
      action: "order_picked",
      orderId: args.orderId,
      createdAt: now,
    });
    return null;
  },
});

export const passOrder = mutation({
  args: { orderId: v.id("orders"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx);
    if (user.role !== "staff") throw new Error("Not authorized");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.pickedByStaffUserId) throw new Error("Order already picked");

    const now = Date.now();
    const passedList = order.orderPassedByUserId || [];
    if (!passedList.some((p: any) => p.userId === userId)) {
      passedList.push({ userId, passedAt: now, reason: args.reason });
      await ctx.db.patch(args.orderId, { orderPassedByUserId: passedList, updatedAt: now });
    }

    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "order",
      entityId: String(args.orderId),
      action: "order_passed",
      metadata: { reason: args.reason },
      orderId: args.orderId,
      createdAt: now,
    });
    return null;
  },
});

export const moveToInProgress = mutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx);
    if (user.role !== "staff") throw new Error("Not authorized");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.pickedByStaffUserId !== userId) throw new Error("Only picking staff can start work");
    if (!(order.status === "picked" || order.status === "on_hold")) throw new Error("Invalid status");

    const now = Date.now();
    await ctx.db.patch(args.orderId, { status: "in_progress", updatedAt: now });
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "order",
      entityId: String(args.orderId),
      action: "order_in_progress",
      orderId: args.orderId,
      createdAt: now,
    });
    return null;
  },
});

export const holdOrder = mutation({
  args: { orderId: v.id("orders"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx);
    if (user.role !== "staff") throw new Error("Not authorized");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.pickedByStaffUserId !== userId) throw new Error("Only picking staff can hold");
    if (!(order.status === "picked" || order.status === "in_progress")) throw new Error("Invalid status");

    const now = Date.now();
    await ctx.db.patch(args.orderId, { status: "on_hold", holdReason: args.reason, updatedAt: now });
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "order",
      entityId: String(args.orderId),
      action: "order_hold",
      metadata: { reason: args.reason },
      orderId: args.orderId,
      createdAt: now,
    });
    return null;
  },
});

export const resumeOrder = mutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx);
    if (user.role !== "staff") throw new Error("Not authorized");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.pickedByStaffUserId !== userId) throw new Error("Only picking staff can resume");
    if (order.status !== "on_hold") throw new Error("Order not on hold");

    const now = Date.now();
    await ctx.db.patch(args.orderId, { status: "in_progress", holdReason: undefined, updatedAt: now });
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "order",
      entityId: String(args.orderId),
      action: "order_resume",
      orderId: args.orderId,
      createdAt: now,
    });
    return null;
  },
});

export const submitFulfilment = mutation({
  args: {
    orderId: v.id("orders"),
    merchantLink: v.string(),
    nameOnOrder: v.string(),
    finalValueUsd: v.number(),
    proofFileIds: v.array(v.id("files")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx);
    if (user.role !== "staff") throw new Error("Not authorized");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.pickedByStaffUserId !== userId) throw new Error("Only picking staff can submit fulfilment");
    if (!(order.status === "in_progress" || order.status === "on_hold")) throw new Error("Invalid status");

    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      status: "fulfil_submitted",
      fulfilment: {
        merchantLink: args.merchantLink,
        nameOnOrder: args.nameOnOrder,
        finalValueUsd: args.finalValueUsd,
        proofFileIds: args.proofFileIds,
      },
      updatedAt: now,
    });
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "order",
      entityId: String(args.orderId),
      action: "order_fulfil_submitted",
      orderId: args.orderId,
      createdAt: now,
    });
    return null;
  },
});

export const completeOrder = mutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx);
    if (user.role !== "reseller") throw new Error("Not authorized");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "fulfil_submitted") throw new Error("Order not ready to complete");

    // Authorization: reseller admin of the team OR the member who created the order
    let canComplete = false;
    if (order.createdByUserId === userId) {
      canComplete = true;
    } else {
      const membership = await ctx.db
        .query("resellerMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .filter((q: any) => q.eq(q.field("teamId"), order.teamId))
        .first();
      if (membership && membership.status === "active_member" && membership.role === "admin") {
        canComplete = true;
      }
    }
    if (!canComplete) throw new Error("Not authorized to complete this order");

    const now = Date.now();
    await ctx.db.patch(args.orderId, { status: "completed", updatedAt: now });
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "order",
      entityId: String(args.orderId),
      action: "order_completed",
      orderId: args.orderId,
      createdAt: now,
    });
    return null;
  },
});

export const raiseDispute = mutation({
  args: { orderId: v.id("orders"), reason: v.string(), attachmentFileIds: v.optional(v.array(v.id("files"))) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx);
    if (user.role !== "reseller") throw new Error("Not authorized");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "completed") throw new Error("Can dispute only after completion");
    // Member can dispute only if they created it; admin can dispute team order
    const membership = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("teamId"), order.teamId))
      .first();
    const isAdmin = membership && membership.status === "active_member" && membership.role === "admin";
    if (!isAdmin && order.createdByUserId !== userId) throw new Error("Not authorized to dispute this order");

    const now = Date.now();
    await ctx.db.insert("disputes", {
      orderId: args.orderId,
      teamId: order.teamId,
      raisedByUserId: userId,
      reason: args.reason,
      attachmentFileIds: args.attachmentFileIds || [],
      status: "open",
      createdAt: now,
    });
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "order",
      entityId: String(args.orderId),
      action: "order_disputed",
      metadata: { reason: args.reason },
      orderId: args.orderId,
      createdAt: now,
    });
    return null;
  },
});


