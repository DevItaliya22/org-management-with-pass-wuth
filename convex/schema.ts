import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    role: v.optional(
      v.union(v.literal("owner"), v.literal("reseller"), v.literal("staff")),
    ),
  }).index("by_email", ["email"]),

  // Put reseller table here nd assign role in auth.ts
  teams: defineTable({
    name: v.string(), // give a default name like "Team 1" and they can change it any fuckign ways
    slug: v.string(),
    // ratePresetId: v.optional(v.id("ratePresets")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  resellerMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    status: v.union(
      v.literal("pending_invitation"), // pending => when user is invited by owner and he has not accepted the invitation
      v.literal("active_member"), // active => when user has accepted the invitation
      v.literal("suspended_member"), // suspended => when user is suspended by owner
      v.literal("default_member"), // default => when user is self added by sign-up page , means by default it will be this one when user logs in first time , then he can ask to be admin and if accepted then he will be active_member and role will be admin
    ),
    approvedByUserId: v.optional(v.id("users")), // Who approved this member (by which Owner)
    isActive: v.boolean(), // isActive => when user is active
    isBlocked: v.boolean(), // isBlocked => when user is blocked by owner
    approvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_role", ["role"])
    .index("by_status", ["status"])
    .index("by_approved_by", ["approvedByUserId"]),
});
