import { action, internalMutation, query, mutation } from "./_generated/server";
import { v } from "convex/values";
// Removed Convex Auth import - authentication handled by NextAuth.js
import { internal } from "./_generated/api";
import { internal as internalApi } from "./_generated/api";

// Create a staff user with email/password and add to staff table
export const createStaffWithPassword = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
    ownerUserId: v.id("users"),
  },
  returns: v.object({ userId: v.id("users") }),
  handler: async (ctx, args): Promise<{ userId: any }> => {
    const ownerUserId = args.ownerUserId;
    if (!ownerUserId) throw new Error("Not authenticated");

    // Verify the caller is an owner
    const owner = await ctx.runQuery(internal.access.getViewerOrThrow, { userId: ownerUserId });
    if (owner.user.role !== "owner") {
      throw new Error("Only owners can create staff users");
    }

    // Create user directly in the database
    const userId = await ctx.runMutation(internal.users.createStaffUser, {
      email: args.email,
      password: args.password,
      name: args.name,
    });

    await ctx.runMutation(internal.staff.finalizeStaffCreation, { userId });

    // Send welcome email to the new staff member (fire-and-forget)
    const email = args.email;
    try {
      await ctx.runAction(internalApi.otp.sendEmailAction.sendStaffWelcomeEmail, {
        email,
      });
    } catch (err) {
      console.error("Failed to send staff welcome email:", err);
    }

    return { userId };
  },
});

export const finalizeStaffCreation = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.userId, { role: "staff" });
    await ctx.db.insert("staff", {
      userId: args.userId,
      status: "offline",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return null;
  },
});

// Get all staff members with their user details
export const getAllStaff = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("staff"),
      _creationTime: v.float64(), // System field automatically added by Convex
      userId: v.id("users"),
      status: v.union(
        v.literal("online"),
        v.literal("paused"),
        v.literal("offline"),
      ),
      isActive: v.boolean(),
      capacityHint: v.optional(v.float64()),
      lastPausedAt: v.optional(v.float64()),
      createdAt: v.float64(),
      updatedAt: v.float64(),
      user: v.object({
        _id: v.id("users"),
        _creationTime: v.float64(),
        name: v.optional(v.string()),
        email: v.string(),
        role: v.optional(
          v.union(
            v.literal("owner"),
            v.literal("reseller"),
            v.literal("staff"),
          ),
        ),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const ownerUserId = args.userId;
    if (!ownerUserId) throw new Error("Not authenticated");

    // Get all staff records
    const staffRecords = await ctx.db.query("staff").collect();

    // Get user details for each staff member
    const staffWithUsers = await Promise.all(
      staffRecords.map(async (staff) => {
        const user = await ctx.db.get(staff.userId);
        if (!user) {
          throw new Error(`User not found for staff ${staff._id}`);
        }
        return {
          ...staff,
          user: {
            _id: user._id,
            _creationTime: user._creationTime,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      }),
    );

    return staffWithUsers;
  },
});

// Update staff member name
export const updateStaffName = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Update the user's name
    await ctx.db.patch(args.userId, { name: args.name });

    // Update the staff record's updatedAt timestamp
    const staffRecord = await ctx.db
      .query("staff")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (staffRecord) {
      await ctx.db.patch(staffRecord._id, { updatedAt: Date.now() });
    }

    return null;
  },
});

// Get current viewer's staff record
export const getMyStaff = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _creationTime: v.float64(),
      _id: v.id("staff"),
      userId: v.id("users"),
      status: v.union(
        v.literal("online"),
        v.literal("paused"),
        v.literal("offline"),
      ),
      isActive: v.boolean(),
      capacityHint: v.optional(v.float64()),
      lastPausedAt: v.optional(v.float64()),
      createdAt: v.float64(),
      updatedAt: v.float64(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const userId = args.userId;
    if (!userId) throw new Error("Not authenticated");
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return staff ?? null;
  },
});

// Update current viewer's staff status
export const updateMyStatus = mutation({
  args: {
    status: v.union(v.literal("online"), v.literal("paused"), v.literal("offline")),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = args.userId;
    if (!userId) throw new Error("Not authenticated");
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!staff) throw new Error("Staff record not found");
    const now = Date.now();
    await ctx.db.patch(staff._id, {
      status: args.status,
      lastPausedAt: args.status === "paused" ? now : staff.lastPausedAt,
      updatedAt: now,
    });
    return null;
  },
});