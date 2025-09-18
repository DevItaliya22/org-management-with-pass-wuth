"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRef, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { X } from "lucide-react";

type OrderChatProps = {
  orderId: string;
  canWrite: boolean;
  canReadOnly: boolean;
  hasDisputes?: boolean;
  disputeCount?: number;
};

export default function OrderChat({
  orderId,
  canWrite,
  canReadOnly,
  hasDisputes = false,
  disputeCount = 0,
}: OrderChatProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<Array<File>>([]);
  const [chatId, setChatId] = useState<Id<"chats"> | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  type OptimisticMessage = {
    _id: string;
    chatId: Id<"chats">;
    senderUserId: Id<"users">;
    senderName?: string;
    content?: string;
    attachmentFileIds?: Array<Id<"files">>;
    createdAt: number;
    viewedByUserIds: Array<Id<"users">>;
    optimistic: true;
  };
  const [optimisticMessages, setOptimisticMessages] = useState<
    Array<OptimisticMessage>
  >([]);

  // Get or create chat for this order
  const getOrCreateChat = useMutation(api.chat.getOrCreateChat);

  // Get chat messages
  const chatData = useQuery(
    api.chat.getChatMessages,
    chatId ? { chatId } : "skip",
  );

  // Get current user to determine message alignment
  const session = useQuery(api.session.getCurrentUserSession, {});
  const currentUserId = session?.user?._id as Id<"users"> | undefined;

  // Send message mutation
  const sendMessageMutation = useMutation(api.chat.sendMessage);

  // File upload mutations
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);
  const saveUploadedFile = useMutation(api.chat.saveUploadedFile);

  // File attachment component
  const FileAttachment = ({ fileId, isOwn }: { fileId: Id<"files">; isOwn: boolean }) => {
    const fileData = useQuery(api.files.getFileById, { fileId });
    const [showImage, setShowImage] = useState(false);

    if (!fileData) {
      return <span className="text-xs opacity-60">Loading...</span>;
    }

    const isImage = (filename: string) => {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
      return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    };

    const handleClick = () => {
      if (isImage(fileData.uiName)) {
        setShowImage(true);
      } else {
        window.open(fileData.url, '_blank');
      }
    };

    return (
      <>
        {isImage(fileData.uiName) ? (
          <div className="cursor-pointer" onClick={handleClick}>
            <img
              src={fileData.url}
              alt={fileData.uiName}
              className="max-w-[200px] max-h-[150px] object-cover rounded-lg border-0 ring-0 outline-none"
              onError={(e) => {
                console.error('Failed to load image:', fileData.url);
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className={`inline-flex rounded-md px-3 py-2 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
            <a
              href={fileData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline hover:no-underline"
            >
              📎 {fileData.uiName}
            </a>
          </div>
        )}

        {/* Image Overlay */}
        {isImage(fileData.uiName) && showImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
            <div className="relative max-w-[90vw] max-h-[90vh]">
              <img
                src={fileData.url}
                alt={fileData.uiName}
                className="max-w-full max-h-full object-contain rounded-lg"
                onError={(e) => {
                  console.error('Failed to load image:', fileData.url);
                  e.currentTarget.style.display = 'none';
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImage(false)}
                className="absolute top-2 right-2 bg-red-600 text-white hover:bg-red-700 h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  // Merge server and optimistic messages for display (server messages first, then optimistic)
  const displayMessages = ((chatData?.messages as any[]) || []).concat(
    optimisticMessages as any[],
  );

  // Auto scroll to bottom when messages update
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length]);

  // Initialize chat when component mounts
  useEffect(() => {
    if (orderId && !chatId) {
      getOrCreateChat({ orderId: orderId as Id<"orders"> })
        .then((result) => {
          setChatId(result.chatId);
        })
        .catch((error) => {
          console.error("Failed to get or create chat:", error);
        });
    }
  }, [orderId, chatId, getOrCreateChat]);

  // Reconcile optimistic messages once the server message appears
  useEffect(() => {
    if (!chatData?.messages?.length || optimisticMessages.length === 0) return;
    setOptimisticMessages((prev) =>
      prev.filter((opt) => {
        const matched = chatData.messages.some((srv) => {
          return (
            srv.senderUserId === opt.senderUserId &&
            srv.content === opt.content &&
            Math.abs(srv.createdAt - opt.createdAt) < 5000
          );
        });
        return !matched;
      }),
    );
  }, [chatData?.messages, optimisticMessages.length]);

  const disabled = !canWrite;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {hasDisputes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <div className="text-sm font-medium text-amber-800">
                Dispute Communication
              </div>
            </div>
            <div className="text-xs text-amber-700 mt-1">
              {disputeCount === 1 
                ? "A dispute has been raised for this order. All further communication regarding this dispute should be handled here."
                : `${disputeCount} disputes have been raised for this order. All further communication regarding these disputes should be handled here.`
              }
            </div>
          </div>
        )}
        <ScrollArea className="max-h-[60vh] rounded border p-2 bg-card overflow-y-auto">
          <div className="space-y-3 text-sm">
            {displayMessages.length === 0 ? (
              <div className="text-muted-foreground text-center py-4">
                No messages yet. Start the conversation!
              </div>
            ) : (
              displayMessages.map((msg) => {
                const isOwn = currentUserId === msg.senderUserId;
                return (
                  <div
                    key={msg._id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[80%]">
                      <div
                        className={`mb-1 flex items-center gap-2 ${
                          isOwn ? "justify-end" : "justify-start"
                        }`}
                      >
                        {!isOwn && (
                          <span className="font-medium text-xs text-muted-foreground">
                            {msg.senderName}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div
                        className={`rounded-md whitespace-pre-wrap break-words ${
                          (() => {
                            const hasText = !!msg.content && String(msg.content).trim().length > 0;
                            const hasAttachments = Array.isArray(msg.attachmentFileIds) && msg.attachmentFileIds.length > 0;
                            // If only attachments (e.g., images), make bubble transparent and remove padding
                            if (hasAttachments && !hasText) return "p-0 bg-transparent text-foreground";
                            // Otherwise use normal bubble style
                            return isOwn
                              ? "px-3 py-2 bg-primary text-primary-foreground"
                              : "px-3 py-2 bg-muted text-foreground";
                          })()
                        }`}
                      >
                        {msg.content && (
                          <div className="text-sm">{msg.content}</div>
                        )}
                        {msg.attachmentFileIds &&
                          msg.attachmentFileIds.length > 0 && (
                            <div className={`flex flex-wrap gap-2 mt-2 ${
                              // Remove top margin if there is no text so images align flush
                              (!!msg.content && String(msg.content).trim().length > 0) ? "" : "mt-0"
                            }`}>
                              {msg.attachmentFileIds.map(
                                (fileId: Id<"files">) => (
                                  <FileAttachment
                                    key={fileId}
                                    fileId={fileId}
                                    isOwn={isOwn}
                                  />
                                ),
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={listEndRef} />
          </div>
        </ScrollArea>
        {/* File chips area (like ChatGPT) */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 rounded border bg-muted/40">
            {files.map((file, idx) => {
              const fileKey = `${file.name}-${file.size}-${idx}`;
              const progress = uploadProgress[fileKey] || 0;
              const isUploading = isSending && progress < 100;

              return (
                <Badge
                  key={fileKey}
                  variant={isUploading ? "outline" : "secondary"}
                  className="flex items-center gap-2"
                >
                  <span className="truncate max-w-[180px]" title={file.name}>
                    {file.name}
                  </span>
                  {isUploading && (
                    <span className="text-xs text-muted-foreground">
                      {progress}%
                    </span>
                  )}
                  {!isSending && (
                    <button
                      type="button"
                      className="ml-1 text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => {
                        setFiles((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      ×
                    </button>
                  )}
                </Badge>
              );
            })}
          </div>
        )}
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              disabled ||
              (!message.trim() && files.length === 0) ||
              !chatId ||
              isSending
            )
              return;

            setIsSending(true);
            setUploadProgress({});

            try {
              const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
              const now = Date.now();
              const optimistic: OptimisticMessage = {
                _id: optimisticId,
                chatId,
                senderUserId: currentUserId!,
                senderName:
                  session?.user?.name || session?.user?.email || "You",
                content: message.trim() || undefined,
                createdAt: now,
                viewedByUserIds: currentUserId ? [currentUserId] : [],
                optimistic: true,
              };
              setOptimisticMessages((prev) => [...prev, optimistic]);

              // Upload files if any
              let attachmentFileIds: Id<"files">[] = [];
              if (files.length > 0) {
                attachmentFileIds = await Promise.all(
                  files.map(async (file, index) => {
                    const fileKey = `${file.name}-${file.size}-${index}`;

                    try {
                      // Step 1: Generate upload URL
                      setUploadProgress((prev) => ({ ...prev, [fileKey]: 10 }));
                      const postUrl = await generateUploadUrl();

                      // Step 2: Upload file to Convex storage
                      setUploadProgress((prev) => ({ ...prev, [fileKey]: 50 }));
                      const result = await fetch(postUrl, {
                        method: "POST",
                        headers: { "Content-Type": file.type },
                        body: file,
                      });
                      const { storageId } = await result.json();

                      // Step 3: Save file metadata to database
                      setUploadProgress((prev) => ({ ...prev, [fileKey]: 80 }));
                      const fileId = await saveUploadedFile({
                        storageId,
                        uiName: file.name,
                        sizeBytes: file.size,
                        entityType: "message",
                        entityId: undefined, // Will be set after message is created
                      });

                      setUploadProgress((prev) => ({
                        ...prev,
                        [fileKey]: 100,
                      }));
                      return fileId;
                    } catch (error) {
                      console.error(
                        `Failed to upload file ${file.name}:`,
                        error,
                      );
                      throw error;
                    }
                  }),
                );
              }

              // Send message with attachments
              await sendMessageMutation({
                orderId: orderId as Id<"orders">,
                chatId,
                content: optimistic.content,
                attachmentFileIds:
                  attachmentFileIds.length > 0 ? attachmentFileIds : undefined,
              });

              setMessage("");
              setFiles([]);
              setUploadProgress({});

              // Do not remove on success immediately; reconciliation effect will handle it
            } catch (error) {
              console.error("Failed to send message:", error);
              // TODO: Show error toast
              // Revert optimistic message on error
              setOptimisticMessages((prev) =>
                prev.filter((m) => !m.optimistic),
              );
            } finally {
              setIsSending(false);
            }
          }}
        >
          <div className="flex items-center gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const selected = Array.from(e.target.files ?? []);
                if (selected.length === 0) return;
                setFiles((prev) => {
                  const combined = [...prev, ...selected];
                  // Deduplicate by name+size+lastModified
                  const map = new Map<string, File>();
                  for (const f of combined) {
                    const key = `${f.name}-${f.size}-${f.lastModified}`;
                    if (!map.has(key)) map.set(key, f);
                  }
                  return Array.from(map.values());
                });
                // Reset input so selecting the same files again triggers change
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isSending}
            >
              Attach files
            </Button>
            <Input
              placeholder={canReadOnly ? "Read-only" : "Type a message…"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={disabled || isSending}
            />
            <Button
              type="submit"
              disabled={
                disabled ||
                (!message.trim() && files.length === 0) ||
                !chatId ||
                isSending
              }
            >
              {isSending ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
