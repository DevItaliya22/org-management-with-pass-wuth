"use client";

import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <button
      className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
      onClick={() => {
        setIsLoading(true);
        void signOut()
          .then(() => {
            router.push("/signin");
          })
          .finally(() => setIsLoading(false));
      }}
      disabled={isLoading}
      aria-label="Sign out"
      title="Sign out"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden="true" />
      )}
      <span>{isLoading ? "Signing out…" : "Sign out"}</span>
    </button>
  );
}
