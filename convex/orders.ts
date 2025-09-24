import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
// Removed Convex Auth import - authentication handled by NextAuth.js
import { Doc, Id } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";
// no internal API references here; keep ACL local

// Helper to ensure viewer and load minimal user
async function requireViewer(ctx: any, userId: Id<"users">) {
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
    userId: v.id("users"),
  },
  returns: v.object({ orderId: v.id("orders") }),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);

    // Only non-owner/non-staff can create orders (reseller-side users of any kind)
    if (user.role === "owner" || user.role === "staff") {
      throw new Error("Not authorized to create orders");
    }

    // Verify membership in the team: allow default_member ; block suspended
    const membership = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("teamId"), args.teamId))
      .first();
    if (!membership) {
      throw new Error("No membership for this team");
    }
    if (membership.isBlocked) {
      throw new Error("Membership blocked");
    }
    // Permission gate: require explicit canCreateOrder === true
    const canCreate = membership.canCreateOrder === true;
    if (!canCreate) {
      throw new Error("You are not allowed to create orders for this team");
    }

    const now = Date.now();

    // Precompute default access lists
    // All owners
    const owners = await ctx.db
      .query("users")
      .withIndex("by_role", (q: any) => q.eq("role", "owner"))
      .collect();
    const ownerIds = owners.map((o: any) => o._id);

    // Team admins of this team
    const teamAdmins = await ctx.db
      .query("resellerMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("role"), "admin"),
          q.eq(q.field("isBlocked"), false),
          q.eq(q.field("isActive"), true),
        ),
      )
      .collect();
    const teamAdminUserIds = teamAdmins.map((m: any) => m.userId);

    // Creator (reseller member who created the order)
    const creatorId = userId;

    const defaultAccessIds = Array.from(
      new Set([...ownerIds, ...teamAdminUserIds, creatorId].map(String)),
    ).map((id: any) => id as any);

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
      readAccessUserIds: defaultAccessIds as any,
      writeAccessUserIds: defaultAccessIds as any,
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
  args: { orderId: v.id("orders"), userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    // Local ACL: owner → all; creator → yes; staff → only if picked OR if submitted (in queue); reseller admin → team orders
    if (user.role === "owner") return order;
    if (order.createdByUserId === userId) return order;
    if (user.role === "staff" && order.pickedByStaffUserId === userId)
      return order;
    // Allow staff to view submitted orders (in queue) even if not picked yet
    if (user.role === "staff" && order.status === "submitted" && !order.pickedByStaffUserId) {
      // Check if staff hasn't passed this order yet
      const hasPassed = order.orderPassedByUserId?.some((p: any) => p.userId === userId);
      if (!hasPassed) return order;
    }

    // Check read access permissions
    if (
      order.readAccessUserIds.includes(userId) ||
      order.writeAccessUserIds.includes(userId)
    ) {
      return order;
    }

    if (user.role === "reseller") {
      const membership = await ctx.db
        .query("resellerMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .filter((q: any) => q.eq(q.field("teamId"), order.teamId))
        .first();
      if (
        membership &&
        membership.isActive &&
        !membership.isBlocked &&
        membership.role === "admin"
      ) {
        return order;
      }
    }
    // Return null instead of throwing to allow clients to handle unauthorized state gracefully
    return null;
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
    userId: v.id("users"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { user } = await requireViewer(ctx, args.userId);
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
    userId: v.id("users"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "reseller") throw new Error("Not authorized");

    if (args.teamId) {
      // Check admin of the team
      const membership = await ctx.db
        .query("resellerMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .filter((q: any) => q.eq(q.field("teamId"), args.teamId))
        .first();
      if (!membership || !membership.isActive || membership.isBlocked)
        throw new Error("Not a member");
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
  args: { paginationOpts: paginationOptsValidator, userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
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
  args: { paginationOpts: paginationOptsValidator, userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "staff") throw new Error("Not authorized");
    const page = await ctx.db
      .query("orders")
      .withIndex("by_picked_by", (q) => q.eq("pickedByStaffUserId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
    return page;
  },
});

// Picked orders assigned to current staff (status strictly 'picked')
export const listPickedOrders = query({
  args: { paginationOpts: paginationOptsValidator, userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "staff") throw new Error("Not authorized");
    const page = await ctx.db
      .query("orders")
      .withIndex("by_picked_by", (q) => q.eq("pickedByStaffUserId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
    // filter to only status 'picked'
    page.page = page.page.filter((o: Doc<"orders">) => o.status === "picked");
    return page;
  },
});

// Role-aware single query for unified orders page
export const listOrdersForViewer = query({
  args: { paginationOpts: paginationOptsValidator, userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role === "owner") {
      return await ctx.db
        .query("orders")
        .withIndex("by_createdAt", (q) => q.gte("createdAt", 0))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    if (user.role === "staff") {
      // Staff: only orders picked by the current staff
      return await ctx.db
        .query("orders")
        .withIndex("by_picked_by", (q) => q.eq("pickedByStaffUserId", userId))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    if (user.role === "reseller") {
      const membership = await ctx.db
        .query("resellerMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
      // Determine if admin of a team
      const isAdmin =
        membership &&
        membership.isActive &&
        !membership.isBlocked &&
        membership.role === "admin";

      // Fetch read/write accessible orders (non-paginated)
      const allOrders = await ctx.db
        .query("orders")
        .withIndex("by_createdAt", (q) => q.gte("createdAt", 0))
        .order("desc")
        .collect();
      const readAccessList = allOrders.filter((order) =>
        order.readAccessUserIds.includes(userId),
      );
      const writeAccessList = allOrders.filter((order) =>
        order.writeAccessUserIds.includes(userId),
      );

      let basePage: Array<Doc<"orders">> = [] as any;

      if (isAdmin) {
        // Admins: paginate team-wide orders (single paginate in function)
        const teamPage = await ctx.db
          .query("orders")
          .withIndex("by_team", (q) => q.eq("teamId", membership.teamId))
          .order("desc")
          .paginate(args.paginationOpts);
        basePage = teamPage.page as any;
      } else {
        // Members: paginate own orders (single paginate in function)
        const ownPage = await ctx.db
          .query("orders")
          .withIndex("by_created_by", (q) => q.eq("createdByUserId", userId))
          .order("desc")
          .paginate(args.paginationOpts);
        basePage = ownPage.page as any;
      }

      // Combine with read/write accessible orders
      const combined = [...basePage, ...readAccessList, ...writeAccessList];

      // De-duplicate by _id, sort by createdAt desc, and slice to page size
      const dedupMap = new Map<string, Doc<"orders">>();
      for (const o of combined) dedupMap.set(String((o as any)._id), o as any);
      const sorted = Array.from(dedupMap.values()).sort(
        (a: any, b: any) => b.createdAt - a.createdAt,
      );
      const numItems = (args.paginationOpts as any).numItems ?? 20;
      const page = sorted.slice(0, numItems);
      return { page, isDone: true, continueCursor: null } as any;
    }
    // Other roles: return empty page
    return { page: [], isDone: true, continueCursor: null } as any;
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
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { user } = await requireViewer(ctx, args.userId);
    if (user.role !== "owner") throw new Error("Not authorized");
    const cats = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.gte("slug", ""))
      .collect();
    return cats;
  },
});

export const getUserLabels = query({
  args: { userIds: v.array(v.id("users")) },
  returns: v.record(
    v.id("users"),
    v.object({ name: v.optional(v.string()), email: v.string() }),
  ),
  handler: async (ctx, args) => {
    const result: Record<string, { name?: string; email: string }> = {};
    for (const uid of args.userIds) {
      const u = await ctx.db.get(uid);
      if (u) {
        result[uid] = { name: u.name, email: u.email } as any;
      }
    }
    return result as any;
  },
});

export const getUserTeamRoles = query({
  args: { teamId: v.id("teams"), userIds: v.array(v.id("users")) },
  returns: v.record(
    v.id("users"),
    v.union(v.literal("admin"), v.literal("member")),
  ),
  handler: async (ctx, args) => {
    const out: Record<string, "admin" | "member"> = {};
    for (const uid of args.userIds) {
      const membership = await ctx.db
        .query("resellerMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", uid))
        .filter((q: any) => q.eq(q.field("teamId"), args.teamId))
        .first();
      if (membership && membership.isActive && !membership.isBlocked) {
        out[uid] = membership.role;
      }
    }
    return out as any;
  },
});

export const createCategory = mutation({
  args: { name: v.string(), slug: v.string(), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireViewer(ctx, args.userId);
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
  args: { categoryId: v.id("categories"), isActive: v.boolean(), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireViewer(ctx, args.userId);
    if (user.role !== "owner") throw new Error("Not authorized");
    const cat = await ctx.db.get(args.categoryId);
    if (!cat) throw new Error("Category not found");
    await ctx.db.patch(args.categoryId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateCategory = mutation({
  args: { categoryId: v.id("categories"), name: v.string(), slug: v.string(), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireViewer(ctx, args.userId);
    if (user.role !== "owner") throw new Error("Not authorized");
    const cat = await ctx.db.get(args.categoryId);
    if (!cat) throw new Error("Category not found");
    await ctx.db.patch(args.categoryId, {
      name: args.name,
      slug: args.slug,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const pickOrder = mutation({
  args: { orderId: v.id("orders"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "staff") throw new Error("Not authorized");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "submitted") throw new Error("Order not in queue");
    if (order.pickedByStaffUserId) throw new Error("Already picked");

    const now = Date.now();
    // Auto-grant read/write access to all owners and picking staff
    const owners = await ctx.db
      .query("users")
      .withIndex("by_role", (q: any) => q.eq("role", "owner"))
      .collect();
    const ownerIds = owners.map((o: any) => o._id);

    const existingRead = new Set<string>(order.readAccessUserIds.map(String));
    const existingWrite = new Set<string>(order.writeAccessUserIds.map(String));
    for (const id of [...ownerIds, userId]) {
      existingRead.add(String(id));
      existingWrite.add(String(id));
    }

    await ctx.db.patch(args.orderId, {
      pickedByStaffUserId: userId,
      status: "picked",
      acceptedAt: now,
      updatedAt: now,
      readAccessUserIds: Array.from(existingRead) as any,
      writeAccessUserIds: Array.from(existingWrite) as any,
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
  args: { orderId: v.id("orders"), reason: v.string(), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "staff") throw new Error("Not authorized");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.pickedByStaffUserId) throw new Error("Order already picked");

    const now = Date.now();
    const passedList = order.orderPassedByUserId || [];
    if (!passedList.some((p: any) => p.userId === userId)) {
      passedList.push({ userId, passedAt: now, reason: args.reason });
      await ctx.db.patch(args.orderId, {
        orderPassedByUserId: passedList,
        updatedAt: now,
      });
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

    // Auto-cancel if all active staff have passed on this order
    // Define active staff as records in `staff` with isActive===true (any status)
    const activeStaff = await ctx.db.query("staff").collect();
    const activeStaffUserIds = activeStaff
      .filter((s: any) => s.isActive)
      .map((s: any) => s.userId);

    // If there are no active staff, do not cancel
    if (activeStaffUserIds.length > 0) {
      const passedUserIds = new Set(
        passedList.map((p: any) => String(p.userId)),
      );
      const allPassed = activeStaffUserIds.every((sid: any) =>
        passedUserIds.has(String(sid)),
      );
      if (allPassed && order.status === "submitted") {
        const cancelAt = Date.now();
        await ctx.db.patch(args.orderId, {
          status: "cancelled",
          updatedAt: cancelAt,
        });
        await ctx.db.insert("auditLogs", {
          actorUserId: userId,
          entity: "order",
          entityId: String(args.orderId),
          action: "order_cancelled_auto_all_passed",
          metadata: { totalActiveStaff: activeStaffUserIds.length },
          orderId: args.orderId,
          createdAt: cancelAt,
        });
      }
    }

    return null;
  },
});

export const moveToInProgress = mutation({
  args: { orderId: v.id("orders"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "staff") throw new Error("Not authorized");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.pickedByStaffUserId !== userId)
      throw new Error("Only picking staff can start work");
    if (!(order.status === "picked" || order.status === "on_hold"))
      throw new Error("Invalid status");

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
  args: { orderId: v.id("orders"), reason: v.string(), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "staff") throw new Error("Not authorized");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.pickedByStaffUserId !== userId)
      throw new Error("Only picking staff can hold");
    if (!(order.status === "picked" || order.status === "in_progress"))
      throw new Error("Invalid status");

    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      status: "on_hold",
      holdReason: args.reason,
      updatedAt: now,
    });
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
  args: { orderId: v.id("orders"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "staff") throw new Error("Not authorized");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.pickedByStaffUserId !== userId)
      throw new Error("Only picking staff can resume");
    if (order.status !== "on_hold") throw new Error("Order not on hold");

    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      status: "in_progress",
      holdReason: undefined,
      updatedAt: now,
    });
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
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "staff") throw new Error("Not authorized");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.pickedByStaffUserId !== userId)
      throw new Error("Only picking staff can submit fulfilment");
    if (!(order.status === "in_progress" || order.status === "on_hold"))
      throw new Error("Invalid status");

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
  args: { orderId: v.id("orders"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "reseller") throw new Error("Not authorized");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "fulfil_submitted")
      throw new Error("Order not ready to complete");

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
      if (
        membership &&
        membership.isActive &&
        !membership.isBlocked &&
        membership.role === "admin"
      ) {
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
  args: {
    orderId: v.id("orders"),
    reason: v.string(),
    attachmentFileIds: v.optional(v.array(v.id("files"))),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "reseller") throw new Error("Not authorized");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (!(order.status === "fulfil_submitted")) {
      throw new Error("Can dispute only after fulfilment");
    }
    // Member can dispute only if they created it; admin can dispute team order
    const membership = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("teamId"), order.teamId))
      .first();
    const isAdmin =
      membership &&
      membership.isActive &&
      !membership.isBlocked &&
      membership.role === "admin";
    if (!isAdmin && order.createdByUserId !== userId)
      throw new Error("Not authorized to dispute this order");

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
    // Update order status to disputed
    await ctx.db.patch(args.orderId, { status: "disputed", updatedAt: now });
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

export const getDisputesByOrder = query({
  args: { orderId: v.id("orders") },
  returns: v.array(
    v.object({
      _id: v.id("disputes"),
      orderId: v.id("orders"),
      teamId: v.id("teams"),
      raisedByUserId: v.id("users"),
      reason: v.string(),
      attachmentFileIds: v.optional(v.array(v.id("files"))),
      status: v.union(
        v.literal("open"),
        v.literal("approved"),
        v.literal("declined"),
        v.literal("partial_refund"),
        v.literal("resolved"),
      ),
      createdAt: v.number(),
      resolvedByUserId: v.optional(v.id("users")),
      resolvedAt: v.optional(v.number()),
      resolutionNotes: v.optional(v.string()),
      adjustmentAmountUsd: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const disputes = await ctx.db
      .query("disputes")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .order("desc")
      .collect();
    return disputes.map((d) => ({
      _id: d._id,
      orderId: d.orderId,
      teamId: d.teamId,
      raisedByUserId: d.raisedByUserId,
      reason: d.reason,
      attachmentFileIds: d.attachmentFileIds,
      status: d.status,
      createdAt: d.createdAt,
      resolvedByUserId: d.resolvedByUserId,
      resolvedAt: d.resolvedAt,
      resolutionNotes: d.resolutionNotes,
      adjustmentAmountUsd: d.adjustmentAmountUsd,
    }));
  },
});

// Get team members available for permission assignment (owner and reseller admin)
export const getTeamMembersForPermissions = query({
  args: { orderId: v.id("orders"), userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.string(),
      role: v.union(v.literal("admin"), v.literal("member")),
      hasReadAccess: v.boolean(),
      hasWriteAccess: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Owner can manage any order's permissions
    if (user.role === "owner") {
      // Continue to get team members
    } else if (user.role === "reseller") {
      // Check if user is admin of the order's team
      const membership = await ctx.db
        .query("resellerMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .filter((q: any) => q.eq(q.field("teamId"), order.teamId))
        .first();

      if (!membership) {
        throw new Error("User is not a member of this team");
      }

      if (!membership.isActive) {
        throw new Error("User membership is not active");
      }

      if (membership.isBlocked) {
        throw new Error("User is blocked from this team");
      }

      if (membership.role !== "admin") {
        throw new Error(
          `User role is ${membership.role}, must be admin to manage permissions`,
        );
      }
    } else {
      throw new Error("Not authorized");
    }

    // Get all active team members (not blocked)
    const teamMembers = await ctx.db
      .query("resellerMembers")
      .withIndex("by_team", (q) => q.eq("teamId", order.teamId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.eq(q.field("isBlocked"), false),
        ),
      )
      .collect();

    // Get user details and check permissions
    const result = await Promise.all(
      teamMembers
        .filter((member) => member.userId !== userId) // Exclude current admin
        .map(async (member) => {
          const memberUser = await ctx.db.get(member.userId);
          if (!memberUser) return null;

          return {
            _id: memberUser._id,
            name: memberUser.name,
            email: memberUser.email,
            role: member.role,
            hasReadAccess: order.readAccessUserIds.includes(memberUser._id),
            hasWriteAccess: order.writeAccessUserIds.includes(memberUser._id),
          };
        }),
    );

    return result.filter(Boolean) as any;
  },
});

// For owner-side permissions: list only staff and owners (non-reseller users)
export const getOwnerSideMembersForPermissions = query({
  args: { orderId: v.id("orders"), userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.string(),
      role: v.union(v.literal("owner"), v.literal("staff")),
      hasReadAccess: v.boolean(),
      hasWriteAccess: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const { user } = await requireViewer(ctx, args.userId);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (user.role !== "owner") throw new Error("Not authorized");

    // Load all owners
    const owners = await ctx.db
      .query("users")
      .withIndex("by_role", (q: any) => q.eq("role", "owner"))
      .collect();

    // Load all staff (only those having staff record and active)
    const staffRecords = await ctx.db.query("staff").collect();
    const staffUsers = await Promise.all(
      staffRecords.map(async (s: any) => {
        const u = await ctx.db.get(s.userId);
        return u ? u : null;
      }),
    );

    const candidates = [
      ...owners.map((u: any) => ({ ...u, role: "owner" as const })),
      ...staffUsers
        .filter(Boolean)
        .map((u: any) => ({ ...u, role: "staff" as const })),
    ];

    // Map to required shape with access flags from the order
    const result = candidates.map((u: any) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      hasReadAccess: order.readAccessUserIds.includes(u._id),
      hasWriteAccess: order.writeAccessUserIds.includes(u._id),
    }));

    return result as any;
  },
});

// Update read access permissions for an order (owner and reseller admin)
export const updateOrderReadAccess = mutation({
  args: {
    orderId: v.id("orders"),
    userIds: v.array(v.id("users")),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Owner can manage any order's permissions
    if (user.role === "owner") {
      // Continue to update permissions
    } else if (user.role === "reseller") {
      // Check if user is admin of the order's team
      const membership = await ctx.db
        .query("resellerMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .filter((q: any) => q.eq(q.field("teamId"), order.teamId))
        .first();

      if (!membership) {
        throw new Error("User is not a member of this team");
      }

      if (!membership.isActive) {
        throw new Error("User membership is not active");
      }

      if (membership.isBlocked) {
        throw new Error("User is blocked from this team");
      }

      if (membership.role !== "admin") {
        throw new Error(
          `User role is ${membership.role}, must be admin to manage permissions`,
        );
      }
    } else {
      throw new Error("Not authorized");
    }

    // If caller is reseller admin, enforce that targets are active team members.
    // Owners can grant access to staff/owners irrespective of team membership.
    if (user.role === "reseller") {
      for (const targetUserId of args.userIds) {
        const targetMembership = await ctx.db
          .query("resellerMembers")
          .withIndex("by_user", (q: any) => q.eq("userId", targetUserId))
          .filter((q: any) => q.eq(q.field("teamId"), order.teamId))
          .first();

        if (
          !targetMembership ||
          !targetMembership.isActive ||
          targetMembership.isBlocked
        ) {
          throw new Error(`User ${targetUserId} is not an active team member`);
        }
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      readAccessUserIds: args.userIds,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "order",
      entityId: String(args.orderId),
      action: "order_read_access_updated",
      metadata: { userIds: args.userIds },
      orderId: args.orderId,
      createdAt: now,
    });

    return null;
  },
});

// Update write access permissions for an order (owner and reseller admin)
export const updateOrderWriteAccess = mutation({
  args: {
    orderId: v.id("orders"),
    userIds: v.array(v.id("users")),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Owner can manage any order's permissions
    if (user.role === "owner") {
      // Continue to update permissions
    } else if (user.role === "reseller") {
      // Check if user is admin of the order's team
      const membership = await ctx.db
        .query("resellerMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .filter((q: any) => q.eq(q.field("teamId"), order.teamId))
        .first();

      if (!membership) {
        throw new Error("User is not a member of this team");
      }

      if (!membership.isActive || membership.isBlocked) {
        throw new Error(`Membership is not active or is blocked`);
      }

      if (membership.role !== "admin") {
        throw new Error(
          `User role is ${membership.role}, must be admin to manage permissions`,
        );
      }
    } else {
      throw new Error("Not authorized");
    }

    if (user.role === "reseller") {
      for (const targetUserId of args.userIds) {
        const targetMembership = await ctx.db
          .query("resellerMembers")
          .withIndex("by_user", (q: any) => q.eq("userId", targetUserId))
          .filter((q: any) => q.eq(q.field("teamId"), order.teamId))
          .first();

        if (
          !targetMembership ||
          !targetMembership.isActive ||
          targetMembership.isBlocked
        ) {
          throw new Error(`User ${targetUserId} is not an active team member`);
        }
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      writeAccessUserIds: args.userIds,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "order",
      entityId: String(args.orderId),
      action: "order_write_access_updated",
      metadata: { userIds: args.userIds },
      orderId: args.orderId,
      createdAt: now,
    });

    return null;
  },
});

// Get who has access to an order (read-only view for members and staff)
export const getOrderAccessInfo = query({
  args: { orderId: v.id("orders"), userId: v.id("users") },
  returns: v.object({
    readAccessUsers: v.array(
      v.object({
        _id: v.id("users"),
        name: v.optional(v.string()),
        email: v.string(),
      }),
    ),
    writeAccessUsers: v.array(
      v.object({
        _id: v.id("users"),
        name: v.optional(v.string()),
        email: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Authorization: owners always, picked staff, explicit read/write, creator,
    // or reseller admin of the same team. Reseller members without access are denied.
    const isOwner = user.role === "owner";
    const isPickedStaff =
      user.role === "staff" && order.pickedByStaffUserId === userId;
    const isCreator = order.createdByUserId === userId;
    const inReadWrite =
      order.readAccessUserIds.includes(userId) ||
      order.writeAccessUserIds.includes(userId);

    let isResellerAdminForTeam = false;
    if (user.role === "reseller") {
      const membership = await ctx.db
        .query("resellerMembers")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .filter((q: any) => q.eq(q.field("teamId"), order.teamId))
        .first();
      isResellerAdminForTeam = !!(
        membership &&
        membership.isActive &&
        !membership.isBlocked &&
        membership.role === "admin"
      );
    }

    const canView =
      isOwner ||
      isPickedStaff ||
      isCreator ||
      inReadWrite ||
      isResellerAdminForTeam;
    if (!canView) throw new Error("Not authorized");

    // Get user details for read access
    const readAccessUsers = await Promise.all(
      order.readAccessUserIds.map(async (uid) => {
        const u = await ctx.db.get(uid);
        return u ? { _id: u._id, name: u.name, email: u.email } : null;
      }),
    );

    // Get user details for write access
    const writeAccessUsers = await Promise.all(
      order.writeAccessUserIds.map(async (uid) => {
        const u = await ctx.db.get(uid);
        return u ? { _id: u._id, name: u.name, email: u.email } : null;
      }),
    );

    return {
      readAccessUsers: readAccessUsers.filter(Boolean) as any,
      writeAccessUsers: writeAccessUsers.filter(Boolean) as any,
    };
  },
});

export const fixAndCompleteDispute = mutation({
  args: {
    disputeId: v.id("disputes"),
    resolutionNotes: v.optional(v.string()),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "owner") throw new Error("Not authorized");

    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute) throw new Error("Dispute not found");
    if (dispute.status !== "open") throw new Error("Dispute is not open");

    const now = Date.now();

    // Update dispute status to approved (fixed & completed)
    await ctx.db.patch(args.disputeId, {
      status: "approved",
      resolutionNotes: args.resolutionNotes,
      resolvedByUserId: userId,
      resolvedAt: now,
    });

    // Check if there are any other open disputes for this order
    const otherOpenDisputes = await ctx.db
      .query("disputes")
      .withIndex("by_order", (q) => q.eq("orderId", dispute.orderId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .collect();

    // If no other open disputes, update order status back to completed
    if (otherOpenDisputes.length === 0) {
      await ctx.db.patch(dispute.orderId, {
        status: "completed",
        updatedAt: now,
      });
    }

    // Log the action
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "dispute",
      entityId: String(args.disputeId),
      action: "dispute_fixed_and_completed",
      metadata: {
        orderId: dispute.orderId,
        resolutionNotes: args.resolutionNotes,
      },
      orderId: dispute.orderId,
      createdAt: now,
    });

    return null;
  },
});

export const declineAndCompleteDispute = mutation({
  args: {
    disputeId: v.id("disputes"),
    resolutionNotes: v.string(),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "owner") throw new Error("Not authorized");

    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute) throw new Error("Dispute not found");
    if (dispute.status !== "open") throw new Error("Dispute is not open");

    const now = Date.now();

    // Update dispute status to declined & completed
    await ctx.db.patch(args.disputeId, {
      status: "declined",
      resolutionNotes: args.resolutionNotes,
      resolvedByUserId: userId,
      resolvedAt: now,
    });

    // Check if there are any other open disputes for this order
    const otherOpenDisputes = await ctx.db
      .query("disputes")
      .withIndex("by_order", (q) => q.eq("orderId", dispute.orderId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .collect();

    // If no other open disputes, update order status back to completed
    if (otherOpenDisputes.length === 0) {
      await ctx.db.patch(dispute.orderId, {
        status: "completed",
        updatedAt: now,
      });
    }

    // Log the action
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "dispute",
      entityId: String(args.disputeId),
      action: "dispute_declined_and_completed",
      metadata: {
        orderId: dispute.orderId,
        resolutionNotes: args.resolutionNotes,
      },
      orderId: dispute.orderId,
      createdAt: now,
    });

    return null;
  },
});

export const partialRefundAndCompleteDispute = mutation({
  args: {
    disputeId: v.id("disputes"),
    adjustmentAmountUsd: v.number(),
    resolutionNotes: v.optional(v.string()),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, user } = await requireViewer(ctx, args.userId);
    if (user.role !== "owner") throw new Error("Not authorized");
    if (args.adjustmentAmountUsd <= 0)
      throw new Error("Adjustment amount must be positive");

    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute) throw new Error("Dispute not found");
    if (dispute.status !== "open") throw new Error("Dispute is not open");

    const now = Date.now();

    // Update dispute status to partial_refund with adjustment
    await ctx.db.patch(args.disputeId, {
      status: "partial_refund",
      adjustmentAmountUsd: args.adjustmentAmountUsd,
      resolutionNotes: args.resolutionNotes,
      resolvedByUserId: userId,
      resolvedAt: now,
    });

    // Get the order to access team information
    const order = await ctx.db.get(dispute.orderId);
    if (!order) throw new Error("Order not found");

    // TODO: Implement balance adjustment when balance system is added
    // Adjust reseller balance (negative adjustment = credit to reseller)
    // const team = await ctx.db.get(order.teamId);
    // if (team) {
    //   await ctx.db.patch(order.teamId, {
    //     balanceUsd: (team.balanceUsd || 0) - args.adjustmentAmountUsd,
    //     updatedAt: now,
    //   });
    // }

    // Check if there are any other open disputes for this order
    const otherOpenDisputes = await ctx.db
      .query("disputes")
      .withIndex("by_order", (q) => q.eq("orderId", dispute.orderId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .collect();

    // If no other open disputes, update order status back to completed
    if (otherOpenDisputes.length === 0) {
      await ctx.db.patch(dispute.orderId, {
        status: "completed",
        updatedAt: now,
      });
    }

    // Log the action
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "dispute",
      entityId: String(args.disputeId),
      action: "dispute_partial_refund_and_completed",
      metadata: {
        orderId: dispute.orderId,
        adjustmentAmountUsd: args.adjustmentAmountUsd,
        resolutionNotes: args.resolutionNotes,
      },
      orderId: dispute.orderId,
      createdAt: now,
    });

    return null;
  },
});
