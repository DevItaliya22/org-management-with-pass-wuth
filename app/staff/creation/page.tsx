"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import { useQuery } from "convex/react";
import { useState } from "react";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GradientButton from "@/components/ui/gradient-button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function StaffCreationPage() {
  const role = useRole();
  const canView = !!role.isOwner;

  const createStaff = useAction(api.staff.createStaffWithPassword);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  if (!canView) return notFound();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    try {
      await createStaff({ email, password });
      setStatus("Staff created");
      setEmail("");
      setPassword("");
    } catch (e: any) {
      setStatus(e?.message ?? "Failed");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-md">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Create Staff</h2>
          <p className="text-sm text-muted-foreground">Provision a new staff account with an email and password.</p>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Staff Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. alex@company.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter a secure password" required />
              </div>
              <div className="pt-2">
                <GradientButton type="submit">Create</GradientButton>
              </div>
            </form>
          </CardContent>
        </Card>
        {status && (
          <Alert>
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}


