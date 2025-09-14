import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { generateRandomTeamName } from "./lib/teamNames";

// Create a new team with random name
export const createTeam = internalMutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.id("teams"),
  handler: async (ctx, args) => {
    const { name, slug } = generateRandomTeamName();
    const now = Date.now();

    return await ctx.db.insert("teams", {
      name,
      slug,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Create a reseller member for a team
export const createResellerMember = internalMutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
  },
  returns: v.id("resellerMembers"),
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("resellerMembers", {
      teamId: args.teamId,
      userId: args.userId,
      role: "member",
      status: "default_member",
      isActive: true,
      isBlocked: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get team by ID
export const getTeam = mutation({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.union(
    v.object({
      _id: v.id("teams"),
      name: v.string(),
      slug: v.string(),
      ratePresetId: v.optional(v.id("ratePresets")),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.teamId);
  },
});

// Get user's team
export const getUserTeam = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("teams"),
      name: v.string(),
      slug: v.string(),
      ratePresetId: v.optional(v.id("ratePresets")),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!member) return null;

    return await ctx.db.get(member.teamId);
  },
});
