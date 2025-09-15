import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

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


