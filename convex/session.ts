import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

export const getCurrentUserSession = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = args.userId;
    if (!userId) return null;

    // Get user data
    const user = await ctx.db.get(userId);
    if (!user) return null;

    // Get reseller member data
    const resellerMember = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    // Get team data if reseller member exists
    let team = null;
    if (resellerMember) {
      team = await ctx.db.get(resellerMember.teamId);
    }

    return {
      user,
      resellerMember,
      team,
    };
  },
});
