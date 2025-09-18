import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFile = mutation({
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
  },
  returns: v.id("files"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.insert("files", {
      storageId: args.storageId,
      uiName: args.uiName,
      sizeBytes: args.sizeBytes,
      uploadedByUserId: userId,
      entityType: args.entityType,
      entityId: args.entityId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getFileById = query({
  args: { fileId: v.id("files") },
  returns: v.union(
    v.object({
      _id: v.id("files"),
      _creationTime: v.number(),
      storageId: v.id("_storage"),
      uiName: v.string(),
      sizeBytes: v.number(),
      uploadedByUserId: v.id("users"),
      entityType: v.union(
        v.literal("order"),
        v.literal("message"),
        v.literal("dispute"),
        v.literal("fulfilment"),
      ),
      entityId: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      url: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      return null;
    }

    const url = await ctx.storage.getUrl(file.storageId);
    if (!url) {
      return null;
    }

    return {
      ...file,
      url,
    };
  },
});

export const getFilesByEntity = query({
  args: {
    entityType: v.union(
      v.literal("order"),
      v.literal("message"),
      v.literal("dispute"),
      v.literal("fulfilment"),
    ),
    entityId: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("files"),
      _creationTime: v.number(),
      storageId: v.id("_storage"),
      uiName: v.string(),
      sizeBytes: v.number(),
      uploadedByUserId: v.id("users"),
      entityType: v.union(
        v.literal("order"),
        v.literal("message"),
        v.literal("dispute"),
        v.literal("fulfilment"),
      ),
      entityId: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      url: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .collect();

    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        return {
          ...file,
          url: url || "",
        };
      })
    );

    return filesWithUrls.filter((file) => file.url);
  },
});

export const updateFileEntityId = mutation({
  args: {
    fileId: v.id("files"),
    entityId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Check if user has permission to update this file
    if (file.uploadedByUserId !== userId) {
      throw new Error("Not authorized to update this file");
    }

    await ctx.db.patch(args.fileId, {
      entityId: args.entityId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Check if user has permission to delete this file
    if (file.uploadedByUserId !== userId) {
      throw new Error("Not authorized to delete this file");
    }

    // Delete from storage
    await ctx.storage.delete(file.storageId);

    // Delete from database
    await ctx.db.delete(args.fileId);

    return null;
  },
});
