import {
  mutation,
  query,
  internalMutation,
  internalAction,
  internalQuery,
  action,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";

export const updateUserName = mutation({
  args: {
    name: v.string(),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx: any, args: any) => {
    await ctx.db.patch(args.userId, {
      name: args.name,
    });

    return null;
  },
});

// NextAuth.js compatible functions
export const getByEmail = query({
  args: { email: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.float64(),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.string(),
      emailVerificationTime: v.optional(v.float64()),
      passwordHash: v.optional(v.string()),
      googleId: v.optional(v.string()),
      role: v.optional(
        v.union(v.literal("owner"), v.literal("reseller"), v.literal("staff")),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .first();
  },
});

export const createFromGoogle = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    image: v.optional(v.string()),
    googleId: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx: any, args: any) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      image: args.image,
      emailVerificationTime: Date.now(), // Google users are pre-verified
      role: "reseller", // Default role
    });

    // Create team and membership for reseller
    const teamId = await ctx.runMutation(internal.teams.createTeam, { userId });
    await ctx.runMutation(internal.teams.createResellerMember, {
      teamId,
      userId,
    });

    return userId;
  },
});

export const sendVerificationEmail = mutation({
  args: { email: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx: any, args: any) => {
    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes from now

    // Check if user exists
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found. Please sign up first.");
    }

    // Mark any existing OTP codes for this email as used
    const existingOtps = await ctx.db
      .query("otpCodes")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .filter((q: any) => q.eq(q.field("used"), false))
      .collect();

    for (const otp of existingOtps) {
      await ctx.db.patch(otp._id, { used: true });
    }

    // Store the new OTP code
    await ctx.db.insert("otpCodes", {
      email: args.email,
      code,
      expiresAt,
      used: false,
      createdAt: now,
    });

    // Send email using the existing OTP system
    await ctx.scheduler.runAfter(0, internal.otp.sendEmailAction.sendOtpEmail, {
      email: args.email,
      code,
      expires: new Date(expiresAt).toISOString(),
    });

    return { success: true };
  },
});

export const verifyEmailCode = mutation({
  args: {
    email: v.string(),
    code: v.string(),
    password: v.optional(v.string()), // Optional password for existing users
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.float64(),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.string(),
      emailVerificationTime: v.optional(v.float64()),
      passwordHash: v.optional(v.string()),
      googleId: v.optional(v.string()),
      role: v.optional(
        v.union(v.literal("owner"), v.literal("reseller"), v.literal("staff")),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx: any, args: any) => {
    const now = Date.now();

    // Find the OTP code
    const otpCode = await ctx.db
      .query("otpCodes")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("code"), args.code),
          q.eq(q.field("used"), false),
          q.gt(q.field("expiresAt"), now),
        ),
      )
      .first();

    if (!otpCode) {
      throw new Error("Invalid or expired verification code");
    }

    // Mark the OTP code as used
    await ctx.db.patch(otpCode._id, { used: true });

    // Get the user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Prepare update data
    const updateData: any = {
      emailVerificationTime: now,
    };

    // If password is provided and user doesn't have a password hash, set it
    if (args.password && !user.passwordHash) {
      const passwordHash = await bcrypt.hash(args.password, 12);
      updateData.passwordHash = passwordHash;
    }

    // Update the user
    await ctx.db.patch(user._id, updateData);

    return user;
  },
});

// Internal mutation to create staff user (used by createStaffWithPassword)
export const createStaffUser = internalMutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx: any, args: any) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(args.password, 12);

    // Create the user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      passwordHash,
      emailVerificationTime: Date.now(), // Staff users are pre-verified
      role: "staff",
    });

    return userId;
  },
});

// Create a new user with email/password (for sign-up)
export const createUserWithPassword = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx: any, args: any): Promise<Id<"users">> => {
    // Check if user already exists
    const existingUser = await ctx.runQuery(internal.users.getUserByEmail, {
      email: args.email,
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(args.password, 12);

    // Create the user
    const userId: Id<"users"> = await ctx.runMutation(
      internal.users.createUserWithPasswordInternal,
      {
        email: args.email,
        name: args.name,
        passwordHash,
        role: "reseller", // Default role for new users
      },
    );

    const teamId = await ctx.runMutation(internal.teams.createTeam, { userId });
    await ctx.runMutation(internal.teams.createResellerMember, {
      teamId,
      userId,
    });

    return userId;
  },
});

// Action to verify email code and optionally set password (required because bcrypt uses setTimeout)
export const verifyEmailCodeAction = action({
  args: {
    email: v.string(),
    code: v.string(),
    password: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.float64(),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.string(),
      emailVerificationTime: v.optional(v.float64()),
      passwordHash: v.optional(v.string()),
      googleId: v.optional(v.string()),
      role: v.optional(
        v.union(v.literal("owner"), v.literal("reseller"), v.literal("staff")),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx: any, args: any): Promise<any> => {
    const now = Date.now();

    // Find the OTP code
    const otpCode = await ctx.runQuery(internal.users.getOtpCode, {
      email: args.email,
      code: args.code,
    });

    if (!otpCode) {
      throw new Error("Invalid or expired verification code");
    }

    // Mark the OTP code as used
    await ctx.runMutation(internal.users.markOtpAsUsed, {
      otpId: otpCode._id,
    });

    // Get the user
    const user: any = await ctx.runQuery(internal.users.getUserByEmail, {
      email: args.email,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Prepare update data
    const updateData: any = {
      emailVerificationTime: now,
    };

    // If password is provided and user doesn't have a password hash, set it
    if (args.password && !user.passwordHash) {
      const passwordHash = await bcrypt.hash(args.password, 12);
      updateData.passwordHash = passwordHash;
    }

    // Update the user
    await ctx.runMutation(internal.users.updateUser, {
      userId: user._id,
      updateData,
    });

    return user;
  },
});

// Send password reset OTP (reuses otpCodes)
export const sendPasswordResetEmail = mutation({
  args: { email: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx: any, args: any) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .first();

    // Return success regardless to avoid email enumeration
    if (!user) return { success: true };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000;

    const existingOtps = await ctx.db
      .query("otpCodes")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .filter((q: any) => q.eq(q.field("used"), false))
      .collect();
    for (const otp of existingOtps) {
      await ctx.db.patch(otp._id, { used: true });
    }

    await ctx.db.insert("otpCodes", {
      email: args.email,
      code,
      expiresAt,
      used: false,
      createdAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.otp.sendEmailAction.sendOtpEmail, {
      email: args.email,
      code,
      expires: new Date(expiresAt).toISOString(),
    });

    return { success: true };
  },
});

// Reset password using OTP code
export const resetPasswordWithOtp = action({
  args: { email: v.string(), code: v.string(), newPassword: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx: any, args: any) => {
    const otp = await ctx.runQuery(internal.users.getOtpCode, {
      email: args.email,
      code: args.code,
    });
    if (!otp) {
      throw new Error("Invalid or expired verification code");
    }

    await ctx.runMutation(internal.users.markOtpAsUsed, { otpId: otp._id });

    const user = await ctx.runQuery(internal.users.getUserByEmail, {
      email: args.email,
    });
    if (!user) return { success: true };

    const passwordHash = await bcrypt.hash(args.newPassword, 12);
    await ctx.runMutation(internal.users.updateUser, {
      userId: user._id,
      updateData: { passwordHash },
    });

    return { success: true };
  },
});

// Helper queries and mutations for the action
export const getOtpCode = internalQuery({
  args: {
    email: v.string(),
    code: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("otpCodes"),
      _creationTime: v.float64(),
      email: v.string(),
      code: v.string(),
      expiresAt: v.float64(),
      used: v.boolean(),
      createdAt: v.float64(),
    }),
    v.null(),
  ),
  handler: async (ctx: any, args: any) => {
    const now = Date.now();

    return await ctx.db
      .query("otpCodes")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("code"), args.code),
          q.eq(q.field("used"), false),
          q.gt(q.field("expiresAt"), now),
        ),
      )
      .first();
  },
});

export const markOtpAsUsed = internalMutation({
  args: {
    otpId: v.id("otpCodes"),
  },
  returns: v.null(),
  handler: async (ctx: any, args: any) => {
    await ctx.db.patch(args.otpId, { used: true });
    return null;
  },
});

export const getUserByEmail = internalQuery({
  args: {
    email: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.float64(),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.string(),
      emailVerificationTime: v.optional(v.float64()),
      passwordHash: v.optional(v.string()),
      googleId: v.optional(v.string()),
      role: v.optional(
        v.union(v.literal("owner"), v.literal("reseller"), v.literal("staff")),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .first();
  },
});

export const updateUser = internalMutation({
  args: {
    userId: v.id("users"),
    updateData: v.any(),
  },
  returns: v.null(),
  handler: async (ctx: any, args: any) => {
    await ctx.db.patch(args.userId, args.updateData);
    return null;
  },
});

export const createUserWithPasswordInternal = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    passwordHash: v.string(),
    role: v.union(
      v.literal("owner"),
      v.literal("reseller"),
      v.literal("staff"),
    ),
  },
  returns: v.id("users"),
  handler: async (ctx: any, args: any) => {
    // Create the user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      passwordHash: args.passwordHash,
      role: args.role,
    });

    return userId;
  },
});
