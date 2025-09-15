"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useRole } from "@/hooks/use-role";

export default function Home() {
  const {session} = useRole();
  const router = useRouter();

  useEffect(() => {
    if (session && session !== undefined) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  if (session === undefined) {
    return <div className="p-8">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="p-8 flex flex-col gap-4">
        <p>Please sign in.</p>
        <Link className="underline" href="/signin">Go to Sign In</Link>
      </div>
    );
  }

  return <div className="p-8">Redirecting…</div>;
}
