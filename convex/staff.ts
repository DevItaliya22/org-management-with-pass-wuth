import { action, internalMutation, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { internal as internalApi } from "./_generated/api";

// Create a staff user with email/password and add to staff table
export const createStaffWithPassword = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.object({ userId: v.id("users") }),
  handler: async (ctx, args) => {
    const ownerUserId = await getAuthUserId(ctx);
    if (!ownerUserId) throw new Error("Not authenticated");

    // Create auth user via Convex Auth store mutation
    const createResult: any = await ctx.runMutation(internal.auth.store, {
      args: {
        type: "createAccountFromCredentials",
        provider: "password",
        // Pass role in profile so auth bootstrap can detect staff
        profile: { email: args.email, name: args.name, role: "staff" },
        account: { id: args.email, secret: args.password },
      },
    });

    if (!createResult || !("user" in createResult)) {
      throw new Error("Failed to create staff user");
    }

    const userId = createResult.user._id;

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
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("staff"),
      _creationTime: v.number(), // System field automatically added by Convex
      userId: v.id("users"),
      status: v.union(
        v.literal("online"),
        v.literal("paused"),
        v.literal("offline"),
      ),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
      user: v.object({
        _id: v.id("users"),
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
  handler: async (ctx) => {
    const ownerUserId = await getAuthUserId(ctx);
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
    const ownerUserId = await getAuthUserId(ctx);
    if (!ownerUserId) throw new Error("Not authenticated");

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
