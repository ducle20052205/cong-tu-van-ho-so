"use server";

import { revalidatePath } from "next/cache";
import { getConversationMessages } from "@/lib/chat-store";
import { extractLeadFromMessages } from "@/lib/lead-extraction";
import { upsertLead } from "@/lib/lead-store";

export async function extractLeadForConversation(conversationId: string) {
  const messages = await getConversationMessages(conversationId);
  const lead = await extractLeadFromMessages(messages);
  await upsertLead(conversationId, lead);
  revalidatePath("/admin/conversations");
}
