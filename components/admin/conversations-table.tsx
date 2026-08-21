"use client";

import React from "react";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { cn, formatDateTimeVN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { extractLeadForConversation } from "@/app/admin/conversations/actions";
import type { LeadQuality, LeadRow } from "@/lib/lead-store";

export interface ConversationRow {
  id: string;
  startedAt: string;
  messageCount: number;
  messages: { role: "user" | "bot"; content: string; createdAt: string }[];
  lead?: LeadRow;
}

const leadQualityMeta: Record<LeadQuality, { label: string; className: string }> = {
  good: { label: "Lead tốt", className: "bg-green-100 text-green-700 ring-green-200" },
  ok: { label: "Lead tạm ổn", className: "bg-yellow-100 text-yellow-700 ring-yellow-200" },
  spam: { label: "Spam", className: "bg-gray-100 text-gray-600 ring-gray-200" },
};

function LeadQualityBadge({ quality }: { quality: LeadQuality }) {
  const meta = leadQualityMeta[quality];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

function LeadDetail({ lead }: { lead: LeadRow }) {
  const fields: { label: string; value: string }[] = [
    { label: "Họ tên", value: lead.name },
    { label: "Email", value: lead.email },
    { label: "Số điện thoại", value: lead.phone },
    { label: "Nước du học", value: lead.destination_country },
    { label: "Bậc học", value: lead.education_level },
    { label: "Ngành học", value: lead.major },
    { label: "Availability", value: lead.availability },
    { label: "Đã đặt lịch tư vấn", value: lead.has_booked_consultation ? "Có" : "Chưa" },
    { label: "Ghi chú", value: lead.notes },
  ];

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Thông tin lead</span>
        <LeadQualityBadge quality={lead.lead_quality} />
      </div>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className="flex gap-1.5">
            <dt className="shrink-0 text-muted-foreground">{f.label}:</dt>
            <dd className="truncate">{f.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ExtractLeadButton({ conversationId, hasLead }: { conversationId: string; hasLead: boolean }) {
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await extractLeadForConversation(conversationId);
      } catch {
        setError("Không trích xuất được lead, thử lại nhé.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
        <Sparkles className="size-3.5" />
        {isPending ? "Đang trích xuất..." : hasLead ? "Trích xuất lại" : "Trích xuất thông tin lead"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
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
          <TableHead>Lead</TableHead>
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
                <TableCell>
                  {conv.lead ? <LeadQualityBadge quality={conv.lead.lead_quality} /> : "—"}
                </TableCell>
              </TableRow>
              {expanded && (
                <TableRow>
                  <TableCell colSpan={5} className="bg-muted/30 p-4">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Nội dung hội thoại</span>
                        <ExtractLeadButton conversationId={conv.id} hasLead={!!conv.lead} />
                      </div>

                      {conv.lead && <LeadDetail lead={conv.lead} />}

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
