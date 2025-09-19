"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useRole } from "@/hooks/use-role";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import GradientButton from "@/components/ui/gradient-button";
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
import { Pencil, Inbox } from "lucide-react";
import { notFound } from "next/navigation";
import { toast } from "@/components/ui/sonner";

export default function CategoriesPage() {
  const { isLoading, isOwner } = useRole();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<{
    id: string;
    next: boolean;
  } | null>(null);

  // Always call hooks; use stable positions and gate after
  const cats = useQuery(
    api.orders.listAllCategories,
    isLoading ? (undefined as any) : {},
  );
  const createCat = useMutation(api.orders.createCategory);
  const toggleActive = useMutation(api.orders.toggleCategoryActive);
  const updateCat = useMutation(api.orders.updateCategory);

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (!isOwner) return notFound();

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const trimmedName = name.trim();
      const trimmedSlug = slug.trim();
      if (!trimmedName || !trimmedSlug) {
        toast.error("Name and slug are required");
        return;
      }
      await createCat({ name: trimmedName, slug: trimmedSlug });
      setName("");
      setSlug("");
      toast.success("Category created");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create category");
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Categories</h1>
            <p className="text-sm text-muted-foreground">
              Manage category names, slugs and visibility.
            </p>
          </div>
          <div className="min-w-[220px]">
            <Dialog>
              <DialogTrigger asChild>
                <GradientButton>Create Category</GradientButton>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
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
                      placeholder="Ex: Electronics"
                    />
                  </div>
                  <div>
                    <Label>Slug</Label>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="ex: electronics"
                    />
                  </div>
                  <div className="flex items-end">
                    <GradientButton
                      type="submit"
                      isLoading={creating}
                      loadingText="Creating..."
                      disabled={creating || !name.trim() || !slug.trim()}
                    >
                      Create
                    </GradientButton>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            All Categories
          </h3>
          {cats && cats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Name</TableHead>
                  <TableHead className="w-[35%]">Slug</TableHead>
                  <TableHead className="w-[15%]">Status</TableHead>
                  <TableHead className="text-right w-[10%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cats.map((c: any) => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {c.slug}
                      </span>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="text-right">
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
                              await updateCat({
                                categoryId: c._id,
                                name,
                                slug,
                              });
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : cats && cats.length === 0 ? (
            <div className="flex flex-col items-center justify-center border rounded-md py-12 text-center text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2" />
              <div>No categories yet</div>
            </div>
          ) : null}
        </div>
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
                  try {
                    if (pendingToggle) {
                      await toggleActive({
                        categoryId: pendingToggle.id as any,
                        isActive: pendingToggle.next,
                      });
                      toast.success(
                        pendingToggle.next ? "Category activated" : "Category deactivated",
                      );
                    }
                  } catch (e: any) {
                    toast.error(e?.message || "Failed to update category");
                  } finally {
                    setPendingToggle(null);
                    setConfirmOpen(false);
                  }
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave(name, slug);
      toast.success("Category updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
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
    </form>
  );
}
