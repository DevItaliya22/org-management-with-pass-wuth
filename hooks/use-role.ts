"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useRole() {
  const { data: authSession, status } = useSession();
  const isLoading = status === "loading";

  // Get additional user data from Convex
  const convexSession = useQuery(
    api.session.getCurrentUserSession, 
    authSession?.user?.id ? { userId: authSession.user.id as any } : "skip"
  );
  const convexLoading = convexSession === undefined;

  // Avoid defaulting while loading to prevent incorrect redirects/404s on hard reload
  const role = isLoading || convexLoading ? undefined : (authSession?.user as any)?.role || convexSession?.user?.role;
  const memberStatus = convexSession?.resellerMember?.status;
  const memberRole = convexSession?.resellerMember?.role;

  const isOwner = role === "owner";
  const isStaff = role === "staff";
  const isResellerDefaultMember = memberStatus === "default_member";

  // Only one of these should be true for reseller-side:
  const isResellerAdmin = memberStatus === "team_joined" && memberRole === "admin";
  const isResellerMember = memberStatus === "team_joined" && memberRole === "member";
  // Treat ANY reseller (including default_member) as reseller for top-level routing/UI
  const isReseller = role === "reseller";

  return {
    session: convexSession,
    authSession,
    isLoading: isLoading || convexLoading,
    role,
    isOwner,
    isStaff,
    isReseller,
    isResellerAdmin,
    isResellerMember,
    isResellerDefaultMember,
  } as const;
}
