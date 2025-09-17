"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRef, useState } from "react";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Placeholder UI only. Wire to backend when available.
  const disabled = !canWrite;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <ScrollArea className="flex-1 h-[55vh] rounded border p-2 bg-card">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">You:</span> Hello, please confirm
              details.
            </div>
            <div>
              <span className="font-medium">Staff:</span> Working on it.
            </div>
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
          onSubmit={(e) => {
            e.preventDefault();
            if (disabled || !message.trim()) return;
            // No-op: backend not implemented yet
            setMessage("");
            setFiles([]);
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
            <Button type="submit" disabled={disabled || !message.trim()}>
              Send
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
