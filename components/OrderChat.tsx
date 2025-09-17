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

  // Get or create chat for this order
  const getOrCreateChat = useMutation(api.chat.getOrCreateChat);

  // Get chat messages
  const chatData = useQuery(
    api.chat.getChatMessages,
    chatId ? { chatId } : "skip",
  );

  // Send message mutation
  const sendMessageMutation = useMutation(api.chat.sendMessage);

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

  const disabled = !canWrite;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <ScrollArea className="flex-1 h-[55vh] rounded border p-2 bg-card">
          <div className="space-y-2 text-sm">
            {chatData?.messages.length === 0 ? (
              <div className="text-muted-foreground text-center py-4">
                No messages yet. Start the conversation!
              </div>
            ) : (
              chatData?.messages.map((msg) => (
                <div key={msg._id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs text-muted-foreground">
                      {msg.senderName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {msg.content && <div className="text-sm">{msg.content}</div>}
                  {msg.attachmentFileIds &&
                    msg.attachmentFileIds.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        📎 {msg.attachmentFileIds.length} attachment(s)
                      </div>
                    )}
                </div>
              ))
            )}
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
              // For now, we'll just send text messages
              // File upload functionality can be added later
              await sendMessageMutation({
                orderId: orderId as Id<"orders">,
                chatId,
                content: message.trim() || undefined,
                // attachmentFileIds: files.length > 0 ? [] : undefined, // TODO: implement file upload
              });

              setMessage("");
              setFiles([]);
            } catch (error) {
              console.error("Failed to send message:", error);
              // TODO: Show error toast
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
