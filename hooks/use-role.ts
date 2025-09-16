"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useRole() {
  const session = useQuery(api.session.getCurrentUserSession, {});
  const isLoading = session === undefined;

  // Avoid defaulting while loading to prevent incorrect redirects/404s on hard reload
  const role = isLoading ? undefined : session?.user?.role;
  const memberStatus = session?.resellerMember?.status;
  const memberRole = session?.resellerMember?.role;

  const isOwner = role === "owner";
  const isStaff = role === "staff";
  const isResellerDefaultMember = memberStatus === "default_member";

  // Only one of these should be true for reseller-side:
  const isResellerAdmin = !isResellerDefaultMember && memberRole === "admin";
  const isResellerMember = !isResellerDefaultMember && memberRole === "member";
  const isReseller =
    !isResellerDefaultMember &&
    role === "reseller" &&
    (isResellerAdmin || isResellerMember);

  return {
    session,
    isLoading,
    role,
    isOwner,
    isStaff,
    isReseller,
    isResellerAdmin,
    isResellerMember,
    isResellerDefaultMember,
  } as const;
}
