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

type OrderChatProps = {
  orderId: string;
  canWrite: boolean;
  canReadOnly: boolean;
};

export default function OrderChat({
  orderId,
  canWrite,
  canReadOnly,
}: OrderChatProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<Array<File>>([]);
  const [chatId, setChatId] = useState<Id<"chats"> | null>(null);
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
                        className={`rounded-md px-3 py-2 whitespace-pre-wrap break-words ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {msg.content && (
                          <div className="text-sm">{msg.content}</div>
                        )}
                        {msg.attachmentFileIds &&
                          msg.attachmentFileIds.length > 0 && (
                            <div className="text-xs opacity-80 mt-1">
                              📎 {msg.attachmentFileIds.length} attachment(s)
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
            {files.map((file, idx) => (
              <Badge
                key={`${file.name}-${file.size}-${idx}`}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <span className="truncate max-w-[180px]" title={file.name}>
                  {file.name}
                </span>
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
              </Badge>
            ))}
          </div>
        )}
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (disabled || (!message.trim() && files.length === 0) || !chatId)
              return;

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
              setMessage("");
              setFiles([]);

              // For now, we'll just send text messages
              // File upload functionality can be added later
              await sendMessageMutation({
                orderId: orderId as Id<"orders">,
                chatId,
                content: optimistic.content,
                // attachmentFileIds: files.length > 0 ? [] : undefined, // TODO: implement file upload
              });

              // Do not remove on success immediately; reconciliation effect will handle it
            } catch (error) {
              console.error("Failed to send message:", error);
              // TODO: Show error toast
              // Revert optimistic message on error
              setOptimisticMessages((prev) =>
                prev.filter((m) => !m.optimistic),
              );
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
              disabled={disabled}
            >
              Attach files
            </Button>
            <Input
              placeholder={canReadOnly ? "Read-only" : "Type a message…"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={disabled}
            />
            <Button
              type="submit"
              disabled={
                disabled || (!message.trim() && files.length === 0) || !chatId
              }
            >
              Send
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
