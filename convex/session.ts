import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

export const getCurrentUserSession = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
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
