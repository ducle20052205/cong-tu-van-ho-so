import { AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { ConversationsTable, type ConversationRow } from "@/components/admin/conversations-table";
import { listConversationsWithMessages } from "@/lib/chat-store";

export default async function AdminConversationsPage() {
  const conversations = await listConversationsWithMessages();

  const rows: ConversationRow[] = conversations.map((conv) => ({
    id: conv.id,
    startedAt: conv.started_at,
    messageCount: conv.messages.length,
    messages: conv.messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    })),
  }));

  return (
    <>
      <AdminPageHeader
        title="Hội thoại"
        description="Lịch sử hội thoại của khách với chatbot hỏi đáp trên trang chủ."
      />

      <Card>
        <ConversationsTable conversations={rows} />
      </Card>
    </>
  );
}
