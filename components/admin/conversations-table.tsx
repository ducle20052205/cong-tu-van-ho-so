"use client";

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn, formatDateTimeVN } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ConversationRow {
  id: string;
  startedAt: string;
  messageCount: number;
  messages: { role: "user" | "bot"; content: string; createdAt: string }[];
}

export function ConversationsTable({ conversations }: { conversations: ConversationRow[] }) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (conversations.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm text-muted-foreground">
        Chưa có cuộc hội thoại nào từ khách.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Kênh</TableHead>
          <TableHead>Số tin nhắn</TableHead>
          <TableHead>Thời gian bắt đầu</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {conversations.map((conv) => {
          const expanded = expandedId === conv.id;
          return (
            <React.Fragment key={conv.id}>
              <TableRow
                className="cursor-pointer"
                onClick={() => setExpandedId(expanded ? null : conv.id)}
              >
                <TableCell>
                  {expanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell className="font-medium">Web</TableCell>
                <TableCell>{conv.messageCount} tin nhắn</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTimeVN(conv.startedAt)}</TableCell>
              </TableRow>
              {expanded && (
                <TableRow>
                  <TableCell colSpan={4} className="bg-muted/30 p-4">
                    <div className="space-y-2">
                      {conv.messages.map((m, i) => (
                        <div
                          key={i}
                          className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                              m.role === "user"
                                ? "rounded-br-sm bg-primary text-primary-foreground"
                                : "rounded-bl-sm bg-card text-foreground",
                            )}
                          >
                            {m.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
