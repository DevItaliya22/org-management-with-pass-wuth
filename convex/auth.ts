import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { internal } from "./_generated/api";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Google],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      if (args.existingUserId) return; // this will work when user is doing sign-in

      // If creation flow marks this user as staff, skip reseller bootstrap
      // We rely on role passed in profile during account creation
      const isStaff = (args as any)?.profile?.role === "staff";
      if (isStaff) {
        await ctx.db.patch(args.userId, { role: "staff" });
        return;
      }

      // Default: bootstrap reseller account with team & membership
      await ctx.db.patch(args.userId, { role: "reseller" });

      const teamId = await ctx.runMutation(internal.teams.createTeam, { userId: args.userId });

      await ctx.runMutation(internal.teams.createResellerMember, {
        teamId,
        userId: args.userId,
      });
    },
  },
});
