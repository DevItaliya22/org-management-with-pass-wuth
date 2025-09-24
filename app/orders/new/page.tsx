"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useRole } from "@/hooks/use-role";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, File, X } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export default function NewOrderPage() {
  const { session, isLoading, isStaff, isOwner, authSession } = useRole();
  const router = useRouter();
  const categories = useQuery(api.orders.listActiveCategories, {});
  const createOrder = useMutation(api.orders.createOrder);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const updateFileEntityId = useMutation(api.files.updateFileEntityId);

  const teamId = session?.resellerMember?.teamId as string | undefined;

  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [cartValueUsd, setCartValueUsd] = useState<string>("");
  const [merchant, setMerchant] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [contact, setContact] = useState<string>("");
  const [sla, setSla] = useState<"asap" | "today" | "24h">("asap");
  const [pickupAddress, setPickupAddress] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [timeWindow, setTimeWindow] = useState<string>("");
  const [itemsSummary, setItemsSummary] = useState<string>("");
  const [currencyOverride, setCurrencyOverride] = useState<string>("USD");
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return [];

    setUploading(true);
    const fileIds: string[] = [];

    try {
      for (const file of selectedFiles) {
        // Step 1: Get upload URL
        const postUrl = await generateUploadUrl();

        // Step 2: Upload file
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();

        // Step 3: Save file metadata
        const fileId = await saveFile({
          storageId,
          uiName: file.name,
          sizeBytes: file.size,
          entityType: "order",
          entityId: undefined, // Will be set after order creation
          userId: authSession?.user?.id as any,
        });

        fileIds.push(fileId);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
      throw error;
    } finally {
      setUploading(false);
    }

    return fileIds;
  };

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (isStaff || isOwner) return <div className="p-4">Not authorized</div>;
  const canCreateOrder = (session?.resellerMember as any)?.canCreateOrder === true;
  if (!canCreateOrder) return notFound();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) {
      toast.error("No team found in session");
      return;
    }
    if (!categoryId) {
      toast.error("Select a category");
      return;
    }
    try {
      setSubmitting(true);

      // Upload files first
      const fileIds = await uploadFiles();

      const value = parseFloat(cartValueUsd);
      const { orderId } = await createOrder({
        teamId: teamId as any,
        categoryId: categoryId as any,
        cartValueUsd: isNaN(value) ? 0 : value,
        merchant,
        customerName,
        country,
        city,
        contact: contact || undefined,
        sla,
        attachmentFileIds: fileIds as any,
        pickupAddress: pickupAddress || undefined,
        deliveryAddress: deliveryAddress || undefined,
        timeWindow: timeWindow || undefined,
        itemsSummary: itemsSummary || undefined,
        currencyOverride: currencyOverride || undefined,
        userId: authSession?.user?.id as any,
      });

      // Update file entity IDs with the created order ID
      for (const fileId of fileIds) {
        await updateFileEntityId({
          fileId: fileId as any,
          entityId: orderId as unknown as string,
          userId: authSession?.user?.id as any,
        });
      }
      // Smooth redirect to the created order's page
      const url = `/orders/${orderId}`;
      setRedirecting(true);
      try {
        router.prefetch?.(url);
      } catch {}
      toast.success("Order created");
      setTimeout(() => {
        router.replace(url);
      }, 50);
      return;
    } catch (e: any) {
      toast.error(e?.message || "Failed to create order");
    } finally {
      if (!redirecting) setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {(submitting || uploading || redirecting) && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/10 dark:bg-black/60 backdrop-blur-sm">
            <div className="rounded-md bg-white dark:bg-neutral-900 shadow px-4 py-3 text-sm flex items-center gap-2 border border-border">
              <svg
                className="animate-spin h-4 w-4 text-gray-600 dark:text-gray-300"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-gray-700 dark:text-gray-200">
                {redirecting
                  ? "Redirecting to order…"
                  : uploading
                    ? "Uploading files…"
                    : "Creating order…"}
              </span>
            </div>
          </div>
        )}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Create New Order
          </h1>
          <p className="text-muted-foreground mt-2">
            Fill in the details below to create a new order
          </p>
        </div>

        <Card className="shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-white dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-700 border-b rounded-t-xl">
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Order Information
            </CardTitle>
            <p className="text-sm text-muted-foreground dark:text-blue-200">
              Provide the essential details for your order
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <form className="space-y-6" onSubmit={onSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category *
                  </Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((c: any) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cart Value (USD) *
                  </Label>
                  <Input
                    value={cartValueUsd}
                    onChange={(e) => setCartValueUsd(e.target.value)}
                    placeholder="e.g. 120"
                    className="h-11"
                    type="number"
                    step="1"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Merchant *
                  </Label>
                  <Input
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="e.g. Chipotle"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Customer Name *
                  </Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Country *
                  </Label>
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. US"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    City *
                  </Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. NYC"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contact
                  </Label>
                  <Input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="email or phone (optional)"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    SLA *
                  </Label>
                  <Select value={sla} onValueChange={(v: any) => setSla(v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asap">ASAP</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="24h">24h</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Currency Override
                  </Label>
                  <Input
                    value={currencyOverride}
                    onChange={(e) => setCurrencyOverride(e.target.value)}
                    placeholder="e.g. USD (default)"
                    className="h-11"
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Pickup Address
                      </Label>
                      <Textarea
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        placeholder="Enter pickup address (optional)"
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Delivery Address
                      </Label>
                      <Textarea
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Enter delivery address (optional)"
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Details Section */}
              <div className="space-y-4">
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Additional Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Time Window
                      </Label>
                      <Input
                        value={timeWindow}
                        onChange={(e) => setTimeWindow(e.target.value)}
                        placeholder="e.g. pickup/delivery/showtime/flight (optional)"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Items Summary / Notes
                      </Label>
                      <Textarea
                        value={itemsSummary}
                        onChange={(e) => setItemsSummary(e.target.value)}
                        placeholder="Enter items summary or notes (optional)"
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="space-y-4">
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Attachments (Optional)
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="file-upload"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Upload Files
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="file-upload"
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.xlsx,.xls"
                        />
                        <Label
                          htmlFor="file-upload"
                          className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                        >
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">Choose files</span>
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF, TXT,
                        XLSX, XLS
                      </p>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Selected files ({selectedFiles.length}):
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-md border dark:border-gray-600 text-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <File className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                                    {file.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground dark:text-gray-400">
                                    {formatFileSize(file.size)}
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="h-6 w-6 p-0 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Section */}
              <div className="border-t pt-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Fields marked with * are required
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCategoryId(undefined);
                        setCartValueUsd("");
                        setMerchant("");
                        setCustomerName("");
                        setCountry("");
                        setCity("");
                        setContact("");
                        setSla("asap");
                        setPickupAddress("");
                        setDeliveryAddress("");
                        setTimeWindow("");
                        setItemsSummary("");
                        setCurrencyOverride("USD");
                        setSelectedFiles([]);
                        toast.success("Form reset");
                      }}
                      className="px-6"
                    >
                      Reset Form
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || uploading}
                      className="px-8 bg-blue-600 hover:bg-blue-700"
                    >
                      {submitting || uploading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          {uploading
                            ? "Uploading Files..."
                            : "Creating Order..."}
                        </>
                      ) : (
                        "Create Order"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
