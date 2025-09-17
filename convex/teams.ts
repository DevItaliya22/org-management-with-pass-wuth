import { mutation, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { generateRandomTeamName } from "./lib/teamNames";
import { getAuthUserId } from "@convex-dev/auth/server";

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

// Approve or reject a promotion request (Owner only)
export const reviewPromotionRequest = mutation({
  args: {
    requestId: v.id("adminPromotionRequests"),
    approve: v.boolean(),
    reviewNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reviewerUserId = await getAuthUserId(ctx);
    if (!reviewerUserId) throw new Error("Not authenticated");

    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Request already reviewed");

    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      status: args.approve ? "approved" : "rejected",
      reviewedByUserId: reviewerUserId,
      reviewedAt: now,
      reviewNotes: args.reviewNotes,
    });

    if (args.approve) {
      // Update the user's resellerMembers role to admin
      const member = await ctx.db
        .query("resellerMembers")
        .withIndex("by_user", (q) => q.eq("userId", req.requesterUserId))
        .filter((q) => q.eq(q.field("teamId"), req.teamId))
        .first();
      if (!member) throw new Error("Member not found for requester");

      await ctx.db.patch(member._id, {
        role: "admin",
        isActive: true,
        approvedByUserId: reviewerUserId,
        approvedAt: now,
        updatedAt: now,
      });
    }

    return null;
  },
});

// Member requests promotion to admin
export const requestPromotion = mutation({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.id("adminPromotionRequests"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Prevent duplicate pending requests
    const existing = await ctx.db
      .query("adminPromotionRequests")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) =>
        q.and(
          q.eq(q.field("requesterUserId"), userId),
          q.eq(q.field("status"), "pending"),
        ),
      )
      .first();
    if (existing) return existing._id;

    const now = Date.now();
    const id = await ctx.db.insert("adminPromotionRequests", {
      teamId: args.teamId,
      requesterUserId: userId,
      requestedAt: now,
      status: "pending",
    });
    return id;
  },
});

// Owner: List promotion requests with populated names
export const listPromotionRequests = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("adminPromotionRequests"),
      _creationTime: v.number(),
      teamId: v.id("teams"),
      teamName: v.string(),
      requesterUserId: v.id("users"),
      requesterName: v.string(),
      requestedAt: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = args.status
      ? await ctx.db
          .query("adminPromotionRequests")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("adminPromotionRequests").collect();
    const results = [] as Array<{
      _id: Id<"adminPromotionRequests">;
      _creationTime: number;
      teamId: Id<"teams">;
      teamName: string;
      requesterUserId: Id<"users">;
      requesterName: string;
      requestedAt: number;
      status: "pending" | "approved" | "rejected";
    }>;
    for (const r of rows) {
      const [team, requester] = await Promise.all([
        ctx.db.get(r.teamId),
        ctx.db.get(r.requesterUserId),
      ]);
      results.push({
        _id: r._id,
        _creationTime: r._creationTime,
        teamId: r.teamId,
        teamName: team?.name ?? "Unknown Team",
        requesterUserId: r.requesterUserId,
        requesterName:
          (requester?.name as string) ??
          (requester as any)?.email ??
          "Unknown User",
        requestedAt: r.requestedAt,
        status: r.status,
      });
    }
    return results;
  },
});

// Reseller: List my promotion requests with team names
export const listMyPromotionRequests = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("adminPromotionRequests"),
      _creationTime: v.number(),
      teamId: v.id("teams"),
      teamName: v.string(),
      requestedAt: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("adminPromotionRequests")
      .withIndex("by_requester", (q) => q.eq("requesterUserId", userId))
      .collect();
    const results = [] as Array<{
      _id: Id<"adminPromotionRequests">;
      _creationTime: number;
      teamId: Id<"teams">;
      teamName: string;
      requestedAt: number;
      status: "pending" | "approved" | "rejected";
    }>;
    for (const r of rows) {
      const team = await ctx.db.get(r.teamId);
      results.push({
        _id: r._id,
        _creationTime: r._creationTime,
        teamId: r.teamId,
        teamName: team?.name ?? "Unknown Team",
        requestedAt: r.requestedAt,
        status: r.status,
      });
    }
    return results;
  },
});

// Invite a user to a team (admin only)
export const inviteToTeam = mutation({
  args: {
    teamId: v.id("teams"),
    invitedEmail: v.string(),
  },
  returns: v.id("teamInvitationRequests"),
  handler: async (ctx, args) => {
    const inviterId = await getAuthUserId(ctx);
    if (!inviterId) throw new Error("Not authenticated");

    // Ensure inviter is admin of the team
    const membership = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q) => q.eq("userId", inviterId))
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .first();
    if (
      !membership ||
      membership.role !== "admin" ||
      !membership.isActive ||
      membership.isBlocked
    ) {
      throw new Error("Only admins can invite");
    }

    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
    const invitationToken = `${args.teamId}:${now}:${Math.random().toString(36).slice(2, 10)}`;

    return await ctx.db.insert("teamInvitationRequests", {
      teamId: args.teamId,
      invitedEmail: args.invitedEmail.toLowerCase(),
      invitedByUserId: inviterId,
      invitedAt: now,
      status: "pending",
      acceptedByUserId: undefined,
      acceptedAt: undefined,
      expiresAt,
      invitationToken,
    });
  },
});

// List invitations for admin's team
export const listTeamInvitations = query({
  args: {
    teamId: v.id("teams"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("rejected"),
        v.literal("expired"),
      ),
    ),
  },
  returns: v.array(
    v.object({
      _creationTime: v.number(),
      _id: v.id("teamInvitationRequests"),
      teamId: v.id("teams"),
      invitedEmail: v.string(),
      invitedByUserId: v.id("users"),
      invitedAt: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("rejected"),
        v.literal("expired"),
      ),
      acceptedByUserId: v.optional(v.id("users")),
      acceptedAt: v.optional(v.number()),
      expiresAt: v.number(),
      invitationToken: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("teamInvitationRequests")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId));
    if (args.status) {
      q = q.filter((qq) => qq.eq(qq.field("status"), args.status!));
    }
    return await q.collect();
  },
});

// List invitations for current user by email
export const listMyInvitations = query({
  args: {},
  returns: v.array(
    v.object({
      _creationTime: v.number(),
      _id: v.id("teamInvitationRequests"),
      teamId: v.id("teams"),
      teamName: v.string(),
      invitedEmail: v.string(),
      invitedByUserId: v.id("users"),
      invitedByEmail: v.string(),
      invitedAt: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("rejected"),
        v.literal("expired"),
      ),
      acceptedByUserId: v.optional(v.id("users")),
      acceptedAt: v.optional(v.number()),
      expiresAt: v.number(),
      invitationToken: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user) return [];
    const rows = await ctx.db
      .query("teamInvitationRequests")
      .withIndex("by_invited_email", (q) =>
        q.eq("invitedEmail", user.email.toLowerCase()),
      )
      .collect();
    const results: Array<{
      _creationTime: number;
      _id: Id<"teamInvitationRequests">;
      teamId: Id<"teams">;
      teamName: string;
      invitedEmail: string;
      invitedByUserId: Id<"users">;
      invitedByEmail: string;
      invitedAt: number;
      status: "pending" | "accepted" | "rejected" | "expired";
      acceptedByUserId?: Id<"users">;
      acceptedAt?: number;
      expiresAt: number;
      invitationToken: string;
    }> = [];
    for (const r of rows) {
      const [team, inviter] = await Promise.all([
        ctx.db.get(r.teamId),
        ctx.db.get(r.invitedByUserId),
      ]);
      results.push({
        _creationTime: r._creationTime,
        _id: r._id,
        teamId: r.teamId,
        teamName: team?.name ?? "Unknown Team",
        invitedEmail: r.invitedEmail,
        invitedByUserId: r.invitedByUserId,
        invitedByEmail: (inviter as any)?.email ?? "",
        invitedAt: r.invitedAt,
        status: r.status,
        acceptedByUserId: r.acceptedByUserId,
        acceptedAt: r.acceptedAt,
        expiresAt: r.expiresAt,
        invitationToken: r.invitationToken,
      });
    }
    return results;
  },
});

// Accept invitation
export const acceptInvitation = mutation({
  args: { invitationId: v.id("teamInvitationRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const invite = await ctx.db.get(args.invitationId);
    if (!invite) throw new Error("Invitation not found");
    if (invite.status !== "pending")
      throw new Error("Invitation already handled");
    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(args.invitationId, { status: "expired" });
      throw new Error("Invitation expired");
    }

    await ctx.db.patch(args.invitationId, {
      status: "accepted",
      acceptedByUserId: userId,
      acceptedAt: Date.now(),
    });

    const now = Date.now();
    // Deactivate any other active memberships for this user
    const allMemberships = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const m of allMemberships) {
      if (m.teamId !== invite.teamId && m.isActive) {
        await ctx.db.patch(m._id, { isActive: false, updatedAt: now });
      }
    }

    // Ensure membership for the invited team is active
    const invitedMembership = allMemberships.find(
      (m) => m.teamId === invite.teamId,
    );
    if (invitedMembership) {
      await ctx.db.patch(invitedMembership._id, {
        isActive: true,
        isBlocked: false,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("resellerMembers", {
        teamId: invite.teamId,
        userId,
        role: "member",
        status: "default_member",
        isActive: true,
        isBlocked: false,
        createdAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});

// Reject invitation
export const rejectInvitation = mutation({
  args: { invitationId: v.id("teamInvitationRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const invite = await ctx.db.get(args.invitationId);
    if (!invite) throw new Error("Invitation not found");
    if (invite.status !== "pending")
      throw new Error("Invitation already handled");
    await ctx.db.patch(args.invitationId, {
      status: "rejected",
      acceptedByUserId: userId,
      acceptedAt: Date.now(),
    });
    return null;
  },
});

// Update team details (admin only)
export const updateTeam = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
    slug: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const membership = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .first();
    if (
      !membership ||
      membership.role !== "admin" ||
      !membership.isActive ||
      membership.isBlocked
    )
      throw new Error("Only admins can update team");
    const now = Date.now();
    const patch: any = { name: args.name, updatedAt: now };
    if (args.slug) patch.slug = args.slug;
    await ctx.db.patch(args.teamId, patch);
    return null;
  },
});

// Get team members with user details (admin only)
export const getTeamMembers = query({
  args: { teamId: v.id("teams") },
  returns: v.array(
    v.object({
      _id: v.id("resellerMembers"),
      _creationTime: v.number(),
      teamId: v.id("teams"),
      userId: v.id("users"),
      role: v.union(v.literal("admin"), v.literal("member")),
      status: v.union(
        v.literal("pending_invitation"),
        v.literal("default_member"),
      ),
      isActive: v.boolean(),
      isBlocked: v.boolean(),
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
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin of this team
    const membership = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .first();
    if (
      !membership ||
      membership.role !== "admin" ||
      !membership.isActive ||
      membership.isBlocked
    ) {
      throw new Error("Only team admins can view team members");
    }

    // Get all team members
    const teamMembers = await ctx.db
      .query("resellerMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Get user details for each member
    const membersWithUsers = await Promise.all(
      teamMembers.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        if (!user) {
          throw new Error(`User not found for member ${member._id}`);
        }
        return {
          ...member,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      }),
    );

    return membersWithUsers;
  },
});

// Update member status (admin only)
export const updateMemberStatus = mutation({
  args: {
    memberId: v.id("resellerMembers"),
    isActive: v.optional(v.boolean()),
    isBlocked: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get the member record
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    // Check if user is admin of this team
    const adminMembership = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("teamId"), member.teamId))
      .first();
    if (
      !adminMembership ||
      adminMembership.role !== "admin" ||
      !adminMembership.isActive ||
      adminMembership.isBlocked
    ) {
      throw new Error("Only team admins can update member status");
    }

    const now = Date.now();
    const patch: any = { updatedAt: now };
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    if (args.isBlocked !== undefined) patch.isBlocked = args.isBlocked;

    await ctx.db.patch(args.memberId, patch);
    return null;
  },
});

// Get user details for team admin (admin only)
export const getUserDetails = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.string(),
      role: v.optional(
        v.union(v.literal("owner"), v.literal("reseller"), v.literal("staff")),
      ),
      emailVerificationTime: v.optional(v.number()),
      resellerMember: v.optional(
        v.object({
          _id: v.id("resellerMembers"),
          teamId: v.id("teams"),
          role: v.union(v.literal("admin"), v.literal("member")),
          status: v.union(
            v.literal("pending_invitation"),
            v.literal("default_member"),
          ),
          isActive: v.boolean(),
          isBlocked: v.boolean(),
          createdAt: v.number(),
          updatedAt: v.number(),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    // Get the user details
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Get user's reseller member record
    const resellerMember = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    // Allow self access always. Otherwise require admin of same team.
    if (currentUserId !== args.userId) {
      if (resellerMember) {
        const currentUserMembership = await ctx.db
          .query("resellerMembers")
          .withIndex("by_user", (q) => q.eq("userId", currentUserId))
          .filter((q) => q.eq(q.field("teamId"), resellerMember.teamId))
          .first();

        if (
          !currentUserMembership ||
          currentUserMembership.role !== "admin" ||
          !currentUserMembership.isActive ||
          currentUserMembership.isBlocked
        ) {
          throw new Error("You can only view details of users in your team");
        }
      } else {
        throw new Error("User is not a member of any team");
      }
    }

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerificationTime: user.emailVerificationTime,
      resellerMember: resellerMember
        ? {
            _id: resellerMember._id,
            teamId: resellerMember.teamId,
            role: resellerMember.role,
            status: resellerMember.status,
            isActive: resellerMember.isActive,
            isBlocked: resellerMember.isBlocked,
            createdAt: resellerMember.createdAt,
            updatedAt: resellerMember.updatedAt,
          }
        : undefined,
    };
  },
});
