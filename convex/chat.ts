import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
// Removed Convex Auth import - authentication handled by NextAuth.js
import { Doc, Id } from "./_generated/dataModel";

// Helper to ensure viewer and load minimal user
async function requireViewer(ctx: any, userId: Id<"users">) {
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  return { userId, user } as { userId: Id<"users">; user: Doc<"users"> };
}

// Helper to check if user has write access to order chat
async function checkWriteAccess(
  ctx: any,
  userId: Id<"users">,
  orderId: Id<"orders">,
) {
  const order = await ctx.db.get(orderId);
  if (!order) throw new Error("Order not found");

  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");

  // Owner always has access
  if (user.role === "owner") return true;

  // Staff who picked the order has access
  if (user.role === "staff" && order.pickedByStaffUserId === userId)
    return true;

  // Reseller member who created the order has access
  if (order.createdByUserId === userId) return true;

  // Explicit write access list on the order
  if (order.writeAccessUserIds?.includes(userId)) return true;

  // Reseller admin of the same team also has access
  if (user.role === "reseller") {
    const membership = await ctx.db
      .query("resellerMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("teamId"), order.teamId))
      .first();
    if (
      membership &&
      membership.isActive &&
      !membership.isBlocked &&
      membership.role === "admin"
    ) {
      return true;
    }
  }

  return false;
}

// Helper to check if user has read access to order chat
async function checkReadAccess(
  ctx: any,
  userId: Id<"users">,
  orderId: Id<"orders">,
) {
  const order = await ctx.db.get(orderId);
  if (!order) throw new Error("Order not found");

  // Check if user is in readAccessUserIds OR has write access
  const hasExplicitReadAccess = order.readAccessUserIds.includes(userId);
  const hasWriteAccess = await checkWriteAccess(ctx, userId, orderId);

  return hasExplicitReadAccess || hasWriteAccess;
}

export const getChatMessages = query({
  args: { chatId: v.id("chats"), userId: v.id("users") },
  returns: v.union(
    v.null(),
    v.object({
      chat: v.object({
        _id: v.id("chats"),
        _creationTime: v.number(),
        orderId: v.id("orders"),
        isOpen: v.boolean(),
        openedAt: v.number(),
        closedAt: v.optional(v.number()),
      }),
      messages: v.array(
        v.object({
          _id: v.id("messages"),
          _creationTime: v.number(),
          chatId: v.id("chats"),
          senderUserId: v.id("users"),
          senderName: v.optional(v.string()),
          content: v.optional(v.string()),
          attachmentFileIds: v.optional(v.array(v.id("files"))),
          createdAt: v.number(),
          viewedByUserIds: v.array(v.id("users")),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const { userId } = await requireViewer(ctx, args.userId);

    const chat = await ctx.db.get(args.chatId);
    if (!chat) return null;

    // Check if user has read access to the order
    const hasReadAccess = await checkReadAccess(ctx, userId, chat.orderId);
    if (!hasReadAccess) {
      throw new Error("Not authorized to read this chat");
    }

    // Get messages for this chat
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();

    // Enrich messages with sender names
    const enrichedMessages = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderUserId);
        return {
          ...message,
          senderName: sender?.name || sender?.email || "Unknown User",
        };
      }),
    );

    return {
      chat,
      messages: enrichedMessages,
    };
  },
});

export const sendMessage = mutation({
  args: {
    orderId: v.id("orders"),
    chatId: v.id("chats"),
    content: v.optional(v.string()),
    attachmentFileIds: v.optional(v.array(v.id("files"))),
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({ messageId: v.id("messages") }),
    v.object({ error: v.string() }),
  ),
  handler: async (ctx, args) => {
    const { userId } = await requireViewer(ctx, args.userId);

    // Verify the order exists and user has write access
    const hasWriteAccess = await checkWriteAccess(ctx, userId, args.orderId);
    if (!hasWriteAccess) {
      return {
        error: "You don't have permission to write to this chat",
      } as any;
    }

    // Verify the chat exists and belongs to the order
    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error("Chat not found");
    if (chat.orderId !== args.orderId) {
      throw new Error("Chat does not belong to this order");
    }

    // Ensure chat is open
    if (!chat.isOpen) {
      throw new Error("Chat is closed");
    }

    // Validate that we have either content or attachments
    if (
      !args.content &&
      (!args.attachmentFileIds || args.attachmentFileIds.length === 0)
    ) {
      throw new Error("Message must have either content or attachments");
    }

    const now = Date.now();

    // Create the message
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      senderUserId: userId,
      content: args.content,
      attachmentFileIds: args.attachmentFileIds,
      createdAt: now,
      viewedByUserIds: [userId], // Sender has viewed the message
    });

    // Update file records to link them to this message
    if (args.attachmentFileIds && args.attachmentFileIds.length > 0) {
      await Promise.all(
        args.attachmentFileIds.map(async (fileId) => {
          await ctx.db.patch(fileId, {
            entityId: messageId,
            updatedAt: now,
          });
        }),
      );
    }

    return { messageId } as any;
  },
});

// Helper mutation to get or create a chat for an order
export const getOrCreateChat = mutation({
  args: { orderId: v.id("orders"), userId: v.id("users") },
  returns: v.object({ chatId: v.id("chats") }),
  handler: async (ctx, args) => {
    const { userId } = await requireViewer(ctx, args.userId);

    // Check if user has read access to the order
    const hasReadAccess = await checkReadAccess(ctx, userId, args.orderId);
    if (!hasReadAccess) {
      throw new Error("Not authorized to access this order");
    }

    // Check if chat already exists for this order
    const existingChat = await ctx.db
      .query("chats")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .first();

    if (existingChat) {
      return { chatId: existingChat._id };
    }

    // Create new chat
    const now = Date.now();
    const chatId = await ctx.db.insert("chats", {
      orderId: args.orderId,
      isOpen: true,
      openedAt: now,
    });

    return { chatId };
  },
});

// Generate upload URL for file uploads
export const generateUploadUrl = mutation({
  args: { userId: v.id("users") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { userId } = await requireViewer(ctx, args.userId);
    // Any authenticated user can generate upload URLs
    return await ctx.storage.generateUploadUrl();
  },
});

// Save uploaded file metadata to database
export const saveUploadedFile = mutation({
  args: {
    storageId: v.id("_storage"),
    uiName: v.string(),
    sizeBytes: v.number(),
    entityType: v.union(
      v.literal("order"),
      v.literal("message"),
      v.literal("dispute"),
      v.literal("fulfilment"),
    ),
    entityId: v.optional(v.string()),
    userId: v.id("users"),
  },
  returns: v.id("files"),
  handler: async (ctx, args) => {
    const { userId } = await requireViewer(ctx, args.userId);

    const now = Date.now();

    // Create file record
    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      uiName: args.uiName,
      sizeBytes: args.sizeBytes,
      uploadedByUserId: userId,
      entityType: args.entityType,
      entityId: args.entityId,
      createdAt: now,
      updatedAt: now,
    });

    // Log the file upload
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      entity: "file",
      entityId: fileId,
      action: "file_uploaded",
      metadata: {
        fileName: args.uiName,
        fileSize: args.sizeBytes,
        entityType: args.entityType,
        entityId: args.entityId,
      },
      createdAt: now,
    });

    return fileId;
  },
});

// Get file download URL
export const getFileUrl = query({
  args: { fileId: v.id("files"), userId: v.id("users") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const { userId } = await requireViewer(ctx, args.userId);

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Check if user has access to this file based on entity type
    if (file.entityType === "message" && file.entityId) {
      // For message attachments, check if user has read access to the chat
      const message = await ctx.db.get(file.entityId as Id<"messages">);
      if (message) {
        const chat = await ctx.db.get(message.chatId);
        if (chat) {
          const hasReadAccess = await checkReadAccess(
            ctx,
            userId,
            chat.orderId,
          );
          if (!hasReadAccess) {
            throw new Error("Not authorized to access this file");
          }
        }
      }
    } else if (file.entityType === "order" && file.entityId) {
      // For order attachments, check if user has read access to the order
      const hasReadAccess = await checkReadAccess(
        ctx,
        userId,
        file.entityId as Id<"orders">,
      );
      if (!hasReadAccess) {
        throw new Error("Not authorized to access this file");
      }
    }

    return await ctx.storage.getUrl(file.storageId);
  },
});
