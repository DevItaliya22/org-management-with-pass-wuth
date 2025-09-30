import { query } from "./_generated/server";
import { v } from "convex/values";

// Get staff KPIs for owner dashboard
export const getStaffKPIs = query({
  args: {
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  returns: v.array(v.object({
    staffId: v.id("users"),
    staffName: v.string(),
    aht: v.number(), // Average Handle Time in minutes
    successRate: v.number(), // Success percentage
    passHoldRatio: v.number(), // Pass to Hold ratio
    ordersToday: v.number(),
    totalOrders: v.number(),
    status: v.union(v.literal("online"), v.literal("paused"), v.literal("offline")),
  })),
  handler: async (ctx, args) => {
    const startTime = args.dateRange?.start || (Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours
    const endTime = args.dateRange?.end || Date.now();

    // Get all active staff
    const staff = await ctx.db.query("staff").collect();
    const staffKPIs = [];

    for (const s of staff) {
      if (!s.isActive) continue;

      // Get user details
      const user = await ctx.db.get(s.userId);
      if (!user) continue;

      // Get staff's audit logs for the date range
      const staffLogs = await ctx.db
        .query("auditLogs")
        .withIndex("by_actor", (q) => q.eq("actorUserId", s.userId))
        .filter((q) => 
          q.and(
            q.gte(q.field("createdAt"), startTime),
            q.lte(q.field("createdAt"), endTime)
          )
        )
        .collect();

      // Calculate KPIs
      const pickedOrders = staffLogs.filter(log => log.actionType === "order_picked");
      const fulfilledOrders = staffLogs.filter(log => log.actionType === "fulfil_submitted");
      const passedOrders = staffLogs.filter(log => log.actionType === "order_passed");
      const holdOrders = staffLogs.filter(log => log.actionType === "order_hold");

      // Calculate AHT (Average Handle Time)
      let aht = 0;
      if (fulfilledOrders.length > 0) {
        const ahtSum = fulfilledOrders.reduce((sum, fulfilLog) => {
          const endTime = fulfilLog.metrics?.staffEndTime;
          if (!endTime || !fulfilLog.orderId) return sum;
          
          // Find the corresponding order_picked log for this order
          const pickedLog = pickedOrders.find(pickLog => pickLog.orderId === fulfilLog.orderId);
          const startTime = pickedLog?.metrics?.staffStartTime;
          
          if (startTime && endTime) {
            return sum + (endTime - startTime) / (1000 * 60); // Convert to minutes
          }
          return sum;
        }, 0);
        aht = ahtSum / fulfilledOrders.length;
      }

      // Calculate Success Rate
      const totalDecisions = fulfilledOrders.length + passedOrders.length;
      const successRate = totalDecisions > 0 ? (fulfilledOrders.length / totalDecisions) * 100 : 0;

      // Calculate Pass/Hold Ratio
      const passHoldRatio = holdOrders.length > 0 ? passedOrders.length / holdOrders.length : 0;

      // Orders today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const ordersToday = staffLogs.filter(log => 
        log.actionType === "fulfil_submitted" &&
        log.createdAt >= todayStart.getTime() &&
        log.createdAt <= todayEnd.getTime()
      ).length;

      staffKPIs.push({
        staffId: s.userId,
        staffName: user.name || "Unknown",
        aht: Math.round(aht * 10) / 10, // Round to 1 decimal
        successRate: Math.round(successRate * 10) / 10,
        passHoldRatio: Math.round(passHoldRatio * 10) / 10,
        ordersToday,
        totalOrders: fulfilledOrders.length,
        status: s.status,
      });
    }

    return staffKPIs;
  },
});

// Get reseller KPIs for owner dashboard
export const getResellerKPIs = query({
  args: {
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  returns: v.array(v.object({
    teamId: v.id("teams"),
    teamName: v.string(),
    ordersToday: v.number(),
    totalOrders: v.number(),
    disputeRate: v.number(), // Dispute percentage
    lowValueOrders: v.number(), // Orders below $44
    autoCancelRate: v.number(), // Auto-cancel percentage
    revenueToday: v.number(),
  })),
  handler: async (ctx, args) => {
    const startTime = args.dateRange?.start || (Date.now() - 24 * 60 * 60 * 1000);
    const endTime = args.dateRange?.end || Date.now();

    // Get all teams
    const teams = await ctx.db.query("teams").collect();
    const teamKPIs = [];

    for (const team of teams) {
      // Get team's audit logs for the date range
      const teamLogs = await ctx.db
        .query("auditLogs")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .filter((q) => 
          q.and(
            q.gte(q.field("createdAt"), startTime),
            q.lte(q.field("createdAt"), endTime)
          )
        )
        .collect();

      // Calculate KPIs
      const createdOrders = teamLogs.filter(log => log.actionType === "order_created");
      const completedOrders = teamLogs.filter(log => log.actionType === "order_completed");
      const disputedOrders = teamLogs.filter(log => log.actionType === "order_disputed");
      const autoCancelledOrders = teamLogs.filter(log => log.actionType === "order_auto_cancelled");
      const fulfilledOrders = teamLogs.filter(log => log.actionType === "fulfil_submitted");

      // Low-value orders (below $44)
      const lowValueOrders = createdOrders.filter(log => 
        (log.metrics?.orderValue || 0) < 44
      ).length;

      // Orders today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const ordersToday = createdOrders.filter(log => 
        log.createdAt >= todayStart.getTime() &&
        log.createdAt <= todayEnd.getTime()
      ).length;

      // Calculate rates
      const disputeRate = fulfilledOrders.length > 0 ? (disputedOrders.length / fulfilledOrders.length) * 100 : 0;
      const autoCancelRate = createdOrders.length > 0 ? (autoCancelledOrders.length / createdOrders.length) * 100 : 0;

      // Calculate revenue (sum of completed orders)
      const revenueToday = completedOrders.reduce((sum, log) => {
        return sum + (log.metrics?.orderValue || 0);
      }, 0);

      teamKPIs.push({
        teamId: team._id,
        teamName: team.name,
        ordersToday,
        totalOrders: createdOrders.length,
        disputeRate: Math.round(disputeRate * 10) / 10,
        lowValueOrders,
        autoCancelRate: Math.round(autoCancelRate * 10) / 10,
        revenueToday: Math.round(revenueToday * 100) / 100,
      });
    }

    return teamKPIs;
  },
});

// Get recent activity logs for owner dashboard
export const getRecentActivity = query({
  args: {
    limit: v.optional(v.number()),
    actionTypes: v.optional(v.array(v.string())),
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  returns: v.array(v.object({
    _id: v.id("auditLogs"),
    actorUserId: v.id("users"),
    actorName: v.string(),
    orderId: v.optional(v.id("orders")),
    teamId: v.optional(v.id("teams")),
    teamName: v.optional(v.string()),
    actionType: v.string(),
    metrics: v.optional(v.any()),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const actionTypes = args.actionTypes || [
      "order_picked", "order_resumed", "order_passed", "order_hold",
      "fulfil_submitted", "order_created", "order_completed", "order_disputed",
      "order_auto_cancelled", "dispute_resolved"
    ];

    const rangeStart = args.dateRange?.start;
    const rangeEnd = args.dateRange?.end;

    // Get recent audit logs
    let queryBuilder = ctx.db
      .query("auditLogs")
      .withIndex("by_createdAt");

    if (rangeStart !== undefined && rangeEnd !== undefined) {
      queryBuilder = queryBuilder.filter((q) =>
        q.and(q.gte(q.field("createdAt"), rangeStart), q.lte(q.field("createdAt"), rangeEnd))
      );
    }

    const auditLogs = await queryBuilder
      .order("desc")
      .take(limit * 2); // Get more to filter

    // Filter data
    const filteredLogs = auditLogs.filter(log => 
      actionTypes.includes(log.actionType)
    ).slice(0, limit);

    // Enrich with user and team names
    const enrichedLogs = [];
    for (const log of filteredLogs) {
      const user = await ctx.db.get(log.actorUserId);
      let teamName = undefined;
      
      if (log.teamId) {
        const team = await ctx.db.get(log.teamId);
        teamName = team?.name;
      }

      // Better user name resolution
      const actorName = user?.name || user?.email || `User ${log.actorUserId.slice(-6)}`;

      enrichedLogs.push({
        _id: log._id,
        actorUserId: log.actorUserId,
        actorName,
        orderId: log.orderId,
        teamId: log.teamId,
        teamName,
        actionType: log.actionType,
        metrics: log.metrics,
        createdAt: log.createdAt,
      });
    }

    return enrichedLogs;
  },
});

// Get dashboard overview metrics
export const getDashboardOverview = query({
  args: {
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  returns: v.object({
    totalOrdersToday: v.number(),
    activeStaffCount: v.number(),
    pendingDisputes: v.number(),
    revenueToday: v.number(),
    disputeRate: v.number(),
    ordersCompleted: v.number(),
    disputesResolved: v.number(),
    ordersByStatus: v.object({
      submitted: v.number(),
      picked: v.number(),
      inProgress: v.number(),
      onHold: v.number(),
      fulfilSubmitted: v.number(),
      completed: v.number(),
      disputed: v.number(),
      cancelled: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const rangeStart = args.dateRange?.start ?? todayStart.getTime();
    const rangeEnd = args.dateRange?.end ?? todayEnd.getTime();

    // Get today's orders
    const todayOrders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt")
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), rangeStart),
          q.lte(q.field("createdAt"), rangeEnd)
        )
      )
      .collect();

    // Get active staff count (only online staff)
    const activeStaff = await ctx.db
      .query("staff")
      .filter((q) => 
        q.and(
          q.eq(q.field("isActive"), true),
          q.eq(q.field("status"), "online")
        )
      )
      .collect();

    // Get pending disputes (currently open)
    const pendingDisputes = await ctx.db
      .query("disputes")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    // Calculate metrics based on audit logs for accurate historical tracking
    const todayAuditLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_createdAt")
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), rangeStart),
          q.lte(q.field("createdAt"), rangeEnd)
        )
      )
      .collect();

    // Count actions from audit logs
    const ordersWithDisputes = todayAuditLogs.filter(log => log.actionType === "order_disputed").length;
    const ordersCompleted = todayAuditLogs.filter(log => log.actionType === "order_completed").length;
    const disputesResolved = todayAuditLogs.filter(log => log.actionType === "dispute_resolved").length;

    // Calculate dispute rate based on audit logs
    const disputeRate = todayOrders.length > 0 ? (ordersWithDisputes / todayOrders.length) * 100 : 0;

    // Calculate revenue from audit logs (orders completed + disputes resolved today)
    let revenueToday = 0;
    const revenueLogs = todayAuditLogs.filter(log => 
      log.actionType === "order_completed" || log.actionType === "dispute_resolved"
    );
    for (const log of revenueLogs) {
      if (log.metrics?.orderValue) {
        revenueToday += log.metrics.orderValue;
      }
    }

    // Count orders by status
    const ordersByStatus = {
      submitted: todayOrders.filter(o => o.status === "submitted").length,
      picked: todayOrders.filter(o => o.status === "picked").length,
      inProgress: todayOrders.filter(o => o.status === "in_progress").length,
      onHold: todayOrders.filter(o => o.status === "on_hold").length,
      fulfilSubmitted: todayOrders.filter(o => o.status === "fulfil_submitted").length,
      completed: todayOrders.filter(o => o.status === "completed").length,
      disputed: todayOrders.filter(o => o.status === "disputed").length,
      cancelled: todayOrders.filter(o => o.status === "cancelled").length,
    };

    return {
      totalOrdersToday: todayOrders.length,
      activeStaffCount: activeStaff.length,
      pendingDisputes: pendingDisputes.length,
      revenueToday: Math.round(revenueToday * 100) / 100,
      disputeRate: Math.round(disputeRate * 100) / 100,
      ordersCompleted,
      disputesResolved,
      ordersByStatus,
    };
  },
});
