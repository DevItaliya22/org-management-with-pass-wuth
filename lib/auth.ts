import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isTimeout =
        err?.code === "ETIMEDOUT" || err?.cause?.code === "ETIMEDOUT";
      if (i < attempts - 1 && isTimeout) {
        await new Promise((r) => setTimeout(r, 200 * (i + 1)));
        continue;
      }
      break;
    }
  }
  throw lastError;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        code: { label: "Verification Code", type: "text" },
        flow: { label: "Flow", type: "text" },
      },
      async authorize(credentials) {
        console.log("Authorize called with:", {
          email: credentials?.email,
          flow: credentials?.flow,
        });
        if (!credentials?.email) return null;

        try {
          // Handle email verification flow (strict: validate OTP with Convex)
          if (credentials.flow === "email-verification" && credentials.code) {
            const verifiedUser = await withRetry(() =>
              convex.action(api.users.verifyEmailCodeAction, {
                email: credentials.email as string,
                code: credentials.code as string,
              }),
            );
            return verifiedUser
              ? {
                  id: verifiedUser._id,
                  email: verifiedUser.email,
                  name: verifiedUser.name,
                  role: verifiedUser.role,
                }
              : null;
          }

          // Handle password authentication
          if (credentials.password) {
            // If it's a sign-up flow, create user and send verification email
            if (credentials.flow === "signUp") {
              console.log("Creating user for sign-up:", credentials.email);
              // Create the user first using action
              await withRetry(() =>
                convex.action(api.users.createUserWithPassword, {
                  email: credentials.email as string,
                  password: credentials.password as string,
                  name: credentials.name as string,
                }),
              );

              console.log("Sending verification email to:", credentials.email);
              // Then send verification email
              await withRetry(() =>
                convex.mutation(api.users.sendVerificationEmail, {
                  email: credentials.email as string,
                }),
              );
              console.log(
                "Verification email sent, returning null to trigger CredentialsSignin",
              );
              return null;
            }

            // For sign-in flow, get the user
            console.log("Getting user by email:", credentials.email);
            const user = await withRetry(() =>
              convex.query(api.users.getByEmail, {
                email: credentials.email as string,
              }),
            );
            console.log(
              "User found:",
              user ? "Yes" : "No",
              user ? `Password hash: ${user.passwordHash ? "Yes" : "No"}` : "",
            );

            if (!user) {
              console.log("User not found, returning null");
              return null;
            }

            // If user exists but has no password hash, they need to set up a password
            if (!user.passwordHash) {
              console.log(
                "User exists but no password hash, sending verification email to set up password",
              );
              await withRetry(() =>
                convex.mutation(api.users.sendVerificationEmail, {
                  email: credentials.email as string,
                }),
              );
              console.log(
                "Verification email sent for password setup, returning null",
              );
              return null;
            }

            console.log("Verifying password...");
            const isValidPassword = await bcrypt.compare(
              credentials.password as string,
              user.passwordHash,
            );
            console.log("Password valid:", isValidPassword);

            if (!isValidPassword) {
              console.log("Invalid password, returning null");
              return null;
            }

            // Require OTP on sign-in: send OTP then return null to force verification step
            if (credentials.flow === "signIn") {
              try {
                await convex.mutation(api.users.sendVerificationEmail, {
                  email: credentials.email as string,
                });
              } catch (e) {
                console.warn("Failed to send OTP on sign-in", e);
              }
              return null;
            }

            // If not an OTP-requiring flow, return null by default
            return null;
          }

          return null;
        } catch (error) {
          console.error("Auth error:", error);
          // For any error, return null to trigger CredentialsSignin
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        console.log("JWT callback - user:", user, "token:", token);
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        console.log("Session callback - token:", token, "session:", session);
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      console.log("SignIn callback called:", {
        provider: account?.provider,
        email: user.email,
      });
      if (account?.provider === "google") {
        try {
          // Check if user exists in Convex
          const existingUser = await withRetry(() =>
            convex.query(api.users.getByEmail, {
              email: user.email!,
            }),
          );

          if (!existingUser) {
            console.log("Creating new Google user:", user.email);
            // Create new user with Google profile
            const newUserId = await withRetry(() =>
              convex.mutation(api.users.createFromGoogle, {
                email: user.email!,
                name: user.name || "",
                image: user.image || "",
                googleId: account.providerAccountId,
              }),
            );
            // Update the user object with the new ID
            user.id = newUserId;
            console.log("New Google user created with ID:", newUserId);
          } else {
            console.log("Existing Google user found:", existingUser._id);
            // Update the user object with existing ID
            user.id = existingUser._id;
          }

          return true;
        } catch (error) {
          console.error("Google sign-in error:", error);
          return false;
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
