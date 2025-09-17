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
    email: v.string(),
    emailVerificationTime: v.optional(v.number()),
    role: v.optional(
      v.union(v.literal("owner"), v.literal("reseller"), v.literal("staff")),
    ),
  })
    .index("email", ["email"])
    .index("by_role", ["role"]),

  // Put reseller table here nd assign role in auth.ts
  teams: defineTable({
    name: v.string(), // give a default name like "Team 1" and they can change it any fuckign ways
    slug: v.string(),
    ratePresetId: v.optional(v.id("ratePresets")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  resellerMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    status: v.union(
      v.literal("pending_invitation"), // pending => when user is invited by owner and he has not accepted the invitation
      v.literal("default_member"), // default => when user is self added by sign-up page , means by default it will be this one when user logs in first time , then he can ask to be admin and if accepted then he will be active member and role will be admin,
      v.literal("team_joined"), // when user is added by owner or admin of the team
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

  adminPromotionRequests: defineTable({
    teamId: v.id("teams"),
    requesterUserId: v.id("users"), // Reseller member requesting admin role
    requestedAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    reviewedByUserId: v.optional(v.id("users")), // Owner who reviewed the request
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
  })
    .index("by_team", ["teamId"])
    .index("by_requester", ["requesterUserId"])
    .index("by_status", ["status"])
    .index("by_reviewed_by", ["reviewedByUserId"]),

  teamInvitationRequests: defineTable({
    teamId: v.id("teams"),
    invitedEmail: v.string(), // Email address being invited
    invitedByUserId: v.id("users"), // Who sent the invitation
    invitedAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("expired"),
    ),
    acceptedByUserId: v.optional(v.id("users")), // User who accepted (if they sign up)
    acceptedAt: v.optional(v.number()),
    expiresAt: v.number(), // When the invitation expires
    invitationToken: v.string(), // Unique token for the invitation link
  })
    .index("by_team", ["teamId"])
    .index("by_invited_email", ["invitedEmail"])
    .index("by_invited_by", ["invitedByUserId"])
    .index("by_status", ["status"])
    .index("by_token", ["invitationToken"])
    .index("by_expires_at", ["expiresAt"]),

  // chiptole , movies , flights , others
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["isActive"]),

  staff: defineTable({
    userId: v.id("users"),
    status: v.union(
      v.literal("online"),
      v.literal("paused"),
      v.literal("offline"),
    ),
    isActive: v.boolean(),
    capacityHint: v.optional(v.number()),
    lastPausedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  orders: defineTable({
    teamId: v.id("teams"),
    createdByUserId: v.id("users"),
    pickedByStaffUserId: v.optional(v.id("users")),
    categoryId: v.id("categories"),
    cartValueUsd: v.number(),
    merchant: v.string(),
    customerName: v.string(),
    country: v.string(),
    city: v.string(),
    contact: v.optional(v.string()),
    sla: v.union(v.literal("asap"), v.literal("today"), v.literal("24h")),
    attachmentFileIds: v.array(v.id("files")),
    pickupAddress: v.optional(v.string()),
    deliveryAddress: v.optional(v.string()),
    timeWindow: v.optional(v.string()),
    itemsSummary: v.optional(v.string()),
    currencyOverride: v.optional(v.string()),

    // Here order status works like this , when reseller side they submit the form , then the order is in queue , then staff member will either pick or pass , now if picks then no one else can pick this order , and the status of order will be picked for all the person means himself , all other staff and resellers too , now he can update the status of order to in_progress or on_hold and that will be the same as above only , now if he pass then the order status will be pass only for himself , all the other staff member can still see the order as submitted / inqueue accorsing to the side , and let sayif all the staff members has passed the order then the order will be gone to cancelled status rather than passed status , so now all will see cancelled on all the sides means reseller and all staff . Other status like  completed and fullfill_submitted can only be done by the staff member who has picked the order , disputed can be done only by reseller (memebrr or admin any who madr this order ) but only once the order is compeletd .
    status: v.union(
      v.literal("submitted"), // /in_queue // when reseller submits the order in reseller side it will be submitted and in staff side it will be in queue
      v.literal("picked"), // when staff picks the order
      v.union(v.literal("in_progress"), v.literal("on_hold")), // when staff is on hold or in progress
      v.literal("fulfil_submitted"), // comes after on hold or in progress
      v.literal("completed"), // when staff completes the order
      v.literal("disputed"), // when order is completed and theres a dispute
      v.literal("cancelled"), // when reseller cancels the order
    ),
    orderPassedByUserId: v.array(
      v.object({
        userId: v.id("users"),
        passedAt: v.number(),
        reason: v.string(),
      }),
    ), // Who passed the order ( always will be staff only still we will use user_id not staff_id)
    // Here if we ever make a function for checking order by passed user , then there should be check that if all the staff members has passed the order then the order will be gone to cancelled status rather than passed status

    holdReason: v.optional(v.string()),
    autoCancelAt: v.optional(v.number()),
    fulfilment: v.optional(
      v.object({
        merchantLink: v.string(),
        nameOnOrder: v.string(),
        finalValueUsd: v.number(),
        proofFileIds: v.array(v.id("files")),
      }),
    ),
    billing: v.optional(
      v.object({
        ratePercent: v.number(),
        floorUsd: v.number(),
        baseValueUsd: v.number(),
        billedUsd: v.number(),
      }),
    ),
    acceptedAt: v.optional(v.number()), // When order was accepted (moved to picked/in_progress)
    createdAt: v.number(),
    updatedAt: v.number(),
    readAccessUserIds: v.array(v.id("users")), // Users who have read access to this chat , all user id will come staff , reseller , owner , members
    writeAccessUserIds: v.array(v.id("users")), // Users who have write access to this chat , all user id will come staff , reseller , owner , members
  })
    .index("by_team", ["teamId"])
    .index("by_category", ["categoryId"])
    .index("by_status", ["status"])
    .index("by_created_by", ["createdByUserId"])
    .index("by_picked_by", ["pickedByStaffUserId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_acceptedAt", ["acceptedAt"])
    .index("by_passed_by", ["orderPassedByUserId"])
    .index("by_read_access", ["readAccessUserIds"])
    .index("by_write_access", ["writeAccessUserIds"]),

  chats: defineTable({
    orderId: v.id("orders"),
    isOpen: v.boolean(),
    openedAt: v.number(),
    closedAt: v.optional(v.number()),
  })
    .index("by_order", ["orderId"])
    .index("by_open", ["isOpen"]),

  messages: defineTable({
    chatId: v.id("chats"),
    senderUserId: v.id("users"),
    content: v.optional(v.string()),
    attachmentFileIds: v.optional(v.array(v.id("files"))),
    createdAt: v.number(),
    viewedByUserIds: v.array(v.id("users")), // Users who have viewed this message
  })
    .index("by_chat", ["chatId"])
    .index("by_sender", ["senderUserId"])
    .index("by_createdAt", ["createdAt"]),

  ratePresets: defineTable({
    name: v.string(),
    rules: v.array(
      v.object({
        categoryId: v.id("categories"),
        percent: v.number(),
        floorUsd: v.number(),
      }),
    ),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_version", ["version"]),

  payments: defineTable({
    teamId: v.id("teams"),
    amountUsd: v.number(),
    amountInr: v.number(),
    method: v.string(),
    notes: v.optional(v.string()),
    createdByUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_createdAt", ["createdAt"]),

  disputes: defineTable({
    orderId: v.id("orders"),
    teamId: v.id("teams"),
    raisedByUserId: v.id("users"),
    reason: v.string(),
    attachmentFileIds: v.optional(v.array(v.id("files"))),
    status: v.union(
      v.literal("open"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("partial_refund"),
      v.literal("resolved"),
    ),
    resolutionNotes: v.optional(v.string()),
    adjustmentAmountUsd: v.optional(v.number()),
    createdAt: v.number(),
    resolvedByUserId: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_order", ["orderId"])
    .index("by_team", ["teamId"])
    .index("by_status", ["status"]),

  ccSummaries: defineTable({
    staffUserId: v.id("users"),
    dateKey: v.string(),
    dateEpoch: v.number(),
    totalUsed: v.number(),
    totalWorked: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_staff_and_date", ["staffUserId", "dateKey"])
    .index("by_date", ["dateKey"])
    .index("by_dateEpoch", ["dateEpoch"]),

  auditLogs: defineTable({
    actorUserId: v.id("users"),
    entity: v.string(),
    entityId: v.string(),
    action: v.string(),
    metadata: v.optional(v.any()),
    orderId: v.optional(v.id("orders")),
    createdAt: v.number(),
  })
    .index("by_actor", ["actorUserId"])
    .index("by_entity", ["entity", "entityId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_orderId", ["orderId"]),

  costs: defineTable({
    type: v.union(
      v.literal("staff_payout"), // per completed order
      v.literal("proxy"), // daily cost
      v.literal("software"), // monthly cost
      v.literal("misc"), // manual entries
    ),
    amountUsd: v.optional(v.number()),
    amountInr: v.optional(v.number()),
    frequency: v.union(
      v.literal("per_order"),
      v.literal("daily"),
      v.literal("monthly"),
      v.literal("manual"),
    ),
    scope: v.union(v.literal("default"), v.literal("override")),
    dateKey: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_scope", ["scope"])
    .index("by_date", ["dateKey"]),

  files: defineTable({
    s3Key: v.string(), // S3 object key
    uiName: v.string(), // Original filename
    sizeBytes: v.number(), // File size in bytes
    uploadedByUserId: v.id("users"), // Who uploaded the file
    entityType: v.union(
      v.literal("order"),
      v.literal("message"),
      v.literal("dispute"),
      v.literal("fulfilment"),
    ), // What type of entity this file belongs to
    entityId: v.optional(v.string()), // ID of the related entity (orderId, messageId, etc.)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_uploader", ["uploadedByUserId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_s3_key", ["s3Key"])
    .index("by_createdAt", ["createdAt"]),
});
