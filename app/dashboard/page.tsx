"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import Link from "next/link";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { session } = useRole();
  if (session === undefined) return <div className="p-8">Loading...</div>;
  if (!session) {
    return (
      <div className="p-8 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">You are signed out</h1>
          <p className="text-sm text-muted-foreground">Please sign in to view your dashboard.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/signin">Go to Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your profile and team.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                User
                {session.user?.role && (
                  <Badge variant="secondary" className="text-xs">{session.user.role}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Name</span>
                <span className="col-span-2 font-medium">{session.user?.name ?? "-"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Email</span>
                <span className="col-span-2 font-medium break-all">{session.user?.email}</span>
              </div>
            </CardContent>
          </Card>

          {session.team && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  Team
                  {session.resellerMember?.status && (
                    <Badge variant="outline" className="text-xs">{session.resellerMember.status}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Team Name</span>
                  <span className="col-span-2 font-medium">{session.team.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Slug</span>
                  <span className="col-span-2 font-medium">{session.team.slug}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Member Role</span>
                  <span className="col-span-2 font-medium">{session.resellerMember?.role}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}


