"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useRole() {
  const session = useQuery(api.session.getCurrentUserSession, {});
  const isLoading = session === undefined;

  const role = session?.user?.role || "reseller";
  const isOwner = role === "owner";
  const isStaff = role === "staff";
  const isReseller = role === "reseller";
  const isResellerAdmin = session?.resellerMember?.role === "admin";
  const isResellerMember = session?.resellerMember?.role === "member";
  const isResellerDefaultMember = session?.resellerMember?.status === "default_member";

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


