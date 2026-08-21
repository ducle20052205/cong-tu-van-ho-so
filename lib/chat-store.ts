import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only: uses the Supabase secret key, which bypasses RLS. Never import
// this file from a Client Component or expose its client to the browser.

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong .env");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface ChatMessageRow {
  id: string;
  role: "user" | "bot";
  content: string;
  created_at: string;
}

export interface ChatConversationRow {
  id: string;
  started_at: string;
  last_message_at: string;
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessageRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Supabase getConversationMessages error:", error);
    return [];
  }
  return data ?? [];
}

/** Ensures the given conversation id exists; creates a fresh conversation otherwise. */
export async function ensureConversation(conversationId: string | undefined): Promise<string> {
  const supabase = getSupabaseAdmin();

  if (conversationId) {
    const { data } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle();
    if (data) return data.id;
  }

  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({})
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Không tạo được cuộc hội thoại mới: ${error?.message}`);
  }
  return data.id;
}

export async function appendMessage(conversationId: string, role: "user" | "bot", content: string) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error: msgError } = await supabase
    .from("chat_messages")
    .insert({ conversation_id: conversationId, role, content, created_at: now });
  if (msgError) {
    console.error("Supabase appendMessage error:", msgError);
  }

  const { error: convError } = await supabase
    .from("chat_conversations")
    .update({ last_message_at: now })
    .eq("id", conversationId);
  if (convError) {
    console.error("Supabase update last_message_at error:", convError);
  }
}

export interface ConversationWithMessages extends ChatConversationRow {
  messages: ChatMessageRow[];
}

export async function listConversationsWithMessages(): Promise<ConversationWithMessages[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("id, started_at, last_message_at, chat_messages(id, role, content, created_at)")
    .order("last_message_at", { ascending: false })
    .order("created_at", { referencedTable: "chat_messages", ascending: true });

  if (error) {
    console.error("Supabase listConversationsWithMessages error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    started_at: row.started_at,
    last_message_at: row.last_message_at,
    messages: (row.chat_messages ?? []) as ChatMessageRow[],
  }));
}
