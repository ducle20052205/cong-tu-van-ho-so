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

export type LeadQuality = "good" | "ok" | "spam";

export interface LeadRow {
  id: string;
  conversation_id: string;
  name: string;
  email: string;
  phone: string;
  destination_country: string;
  education_level: string;
  major: string;
  availability: string;
  has_booked_consultation: boolean;
  notes: string;
  lead_quality: LeadQuality;
  extracted_at: string;
}

export interface ExtractedLead {
  name: string;
  email: string;
  phone: string;
  destination_country: string;
  education_level: string;
  major: string;
  availability: string;
  has_booked_consultation: boolean;
  notes: string;
  lead_quality: LeadQuality;
}

export async function upsertLead(
  conversationId: string,
  lead: ExtractedLead,
): Promise<LeadRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .upsert(
      { conversation_id: conversationId, ...lead, extracted_at: new Date().toISOString() },
      { onConflict: "conversation_id" },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Không lưu được lead: ${error?.message}`);
  }
  return data;
}

export async function getLeadsByConversationIds(
  conversationIds: string[],
): Promise<Record<string, LeadRow>> {
  if (conversationIds.length === 0) return {};

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .in("conversation_id", conversationIds);

  if (error) {
    console.error("Supabase getLeadsByConversationIds error:", error);
    return {};
  }

  const byConversation: Record<string, LeadRow> = {};
  for (const row of data ?? []) {
    byConversation[row.conversation_id] = row;
  }
  return byConversation;
}
