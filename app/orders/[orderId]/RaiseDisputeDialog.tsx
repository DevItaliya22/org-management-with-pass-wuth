"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, File, X } from "lucide-react";

type Props = {
  orderId: string;
};

export default function RaiseDisputeDialog({ orderId }: Props) {
  const router = useRouter();
  const raiseDispute = useMutation(api.orders.raiseDispute);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);
  const saveUploadedFile = useMutation(api.chat.saveUploadedFile);

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetAndClose = () => {
    setOpen(false);
    setReason("");
    setFiles([]);
    setUploadProgress({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const uploadSelectedFiles = async (): Promise<Array<string>> => {
    if (files.length === 0) return [];
    setUploading(true);
    try {
      const uploadedIds: Array<string> = [];
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const key = `${file.name}-${file.size}-${index}`;
        setUploadProgress((p) => ({ ...p, [key]: 10 }));
        const postUrl = await generateUploadUrl();
        setUploadProgress((p) => ({ ...p, [key]: 50 }));
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        setUploadProgress((p) => ({ ...p, [key]: 80 }));
        const fileId = await saveUploadedFile({
          storageId,
          uiName: file.name,
          sizeBytes: file.size,
          entityType: "dispute",
          entityId: undefined,
        });
        uploadedIds.push(fileId as unknown as string);
        setUploadProgress((p) => ({ ...p, [key]: 100 }));
      }
      return uploadedIds;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      const attachmentFileIds = await uploadSelectedFiles();
      await raiseDispute({
        orderId: orderId as any,
        reason: reason.trim(),
        attachmentFileIds: attachmentFileIds.length
          ? (attachmentFileIds as any)
          : undefined,
      });
      resetAndClose();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="destructive" onClick={() => setOpen(true)}>
        Raise Dispute
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            if (submitting || uploading) return;
            resetAndClose();
          } else {
            setOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Raise Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dispute-reason" className="text-sm font-medium">
                Reason
              </Label>
              <Textarea
                id="dispute-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the issue"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dispute-files" className="text-sm font-medium">
                Attachments (Optional)
              </Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="dispute-files"
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
                    ref={fileInputRef}
                  />
                  <Label
                    htmlFor="dispute-files"
                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Choose files</span>
                  </Label>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Selected files ({files.length}):
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-md text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">
                                {file.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                                {uploading && (
                                  <span className="ml-2">
                                    {uploadProgress[
                                      `${file.name}-${file.size}-${index}`
                                    ] || 0}
                                    %
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setReason("");
                setFiles([]);
                setUploadProgress({});
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              disabled={submitting || uploading}
            >
              Cancel
            </Button>
            <Button
              disabled={!reason.trim() || submitting || uploading}
              onClick={onSubmit}
            >
              {submitting || uploading ? "Submitting…" : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
