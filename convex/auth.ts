import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { internal } from "./_generated/api";
import { NodemailerOTP } from "./otp/NodemailerOTP";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({ verify: NodemailerOTP }), Google],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      if (args.existingUserId) return; // this will work when user is doing sign-in

      // First Time user creation ( role assignment )
      await ctx.db.patch(args.userId, {
        role: "reseller",
      });

      // Create a team for the new reseller
      const teamId = await ctx.runMutation(internal.teams.createTeam, {
        userId: args.userId,
      });

      // Create reseller member record
      await ctx.runMutation(internal.teams.createResellerMember, {
        teamId,
        userId: args.userId,
      });
    },
  },
});
