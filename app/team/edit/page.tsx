"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import { useState } from "react";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TeamEditPage() {
  const role = useRole();
  const isAdmin = role?.isResellerAdmin;
  if (!isAdmin) return notFound();

  const team = role?.session?.team;
  const [name, setName] = useState(team?.name ?? "");
  const [slug, setSlug] = useState(team?.slug ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const updateTeam = useMutation(api.teams.updateTeam);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team?._id) return;
    try {
      await updateTeam({ teamId: team._id, name, slug });
      setMsg("Saved");
    } catch (err: any) {
      setMsg(err?.message ?? "Failed");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-md">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Edit Team</h2>
          <p className="text-sm text-muted-foreground">Update your team name and slug.</p>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Team Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="team-name">Team name</Label>
                <Input id="team-name" placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-slug">Slug</Label>
                <Input id="team-slug" placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
              </div>
              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={!team}>Save</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        {msg && (
          <Alert>
            <AlertDescription>{msg}</AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}


