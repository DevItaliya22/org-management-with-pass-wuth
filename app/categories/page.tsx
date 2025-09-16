"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useRole } from "@/hooks/use-role";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader as DHeader,
  DialogTitle as DTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Pencil } from "lucide-react";
import { notFound } from "next/navigation";

export default function CategoriesPage() {
  const { isLoading, isOwner } = useRole();
  // Always call hooks; use stable positions and gate after
  const cats = useQuery(
    api.orders.listAllCategories,
    isLoading ? (undefined as any) : {},
  );
  const createCat = useMutation(api.orders.createCategory);
  const toggleActive = useMutation(api.orders.toggleCategoryActive);
  const updateCat = useMutation(api.orders.updateCategory);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<{
    id: string;
    next: boolean;
  } | null>(null);

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (!isOwner) return notFound();

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setMsg(null);
      await createCat({ name, slug });
      setName("");
      setSlug("");
      setMsg("Category created");
    } catch (e: any) {
      setMsg(e?.message || "Failed to create category");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Categories</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Add Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DHeader>
                <DTitle>Add Category</DTitle>
              </DHeader>
              <form
                className="grid grid-cols-1 md:grid-cols-3 gap-3"
                onSubmit={onCreate}
              >
                <div>
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit">Create</Button>
                </div>
                {msg && (
                  <div className="md:col-span-3 text-sm text-muted-foreground">
                    {msg}
                  </div>
                )}
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cats?.map((c: any) => (
              <div
                key={c._id}
                className="flex items-center justify-between rounded border p-3"
              >
                <div className="space-y-1">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.slug}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                    <Switch
                      checked={c.isActive}
                      onCheckedChange={(val) => {
                        setPendingToggle({ id: c._id, next: val });
                        setConfirmOpen(true);
                      }}
                    />
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="Edit category"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DHeader>
                        <DTitle>Edit Category</DTitle>
                      </DHeader>
                      <EditCategoryForm
                        id={c._id}
                        initialName={c.name}
                        initialSlug={c.slug}
                        onSave={async (name, slug) => {
                          await updateCat({ categoryId: c._id, name, slug });
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm status change</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingToggle?.next
                  ? "Activate this category?"
                  : "Deactivate this category?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (pendingToggle) {
                    await toggleActive({
                      categoryId: pendingToggle.id as any,
                      isActive: pendingToggle.next,
                    });
                  }
                  setPendingToggle(null);
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

function EditCategoryForm({
  id,
  initialName,
  initialSlug,
  onSave,
}: {
  id: string;
  initialName: string;
  initialSlug: string;
  onSave: (name: string, slug: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      setSaving(true);
      await onSave(name, slug);
      setMsg("Saved");
    } catch (e: any) {
      setMsg(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={submit}>
      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label>Slug</Label>
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      {msg && (
        <div className="md:col-span-3 text-sm text-muted-foreground">{msg}</div>
      )}
    </form>
  );
}
