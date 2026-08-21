import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { ServicePackage } from "@/lib/mock-data";

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

export type EducationLevel = "thpt" | "dai_hoc" | "thac_si";
export type QuoteRequestStatus = "cho_duyet" | "da_duyet" | "tu_choi";

export interface QuoteRequestRow {
  id: string;
  country: string;
  education_level: EducationLevel;
  package: ServicePackage;
  quote_amount: number;
  email: string;
  phone: string;
  status: QuoteRequestStatus;
  created_at: string;
}

export interface NewQuoteRequest {
  country: string;
  educationLevel: EducationLevel;
  servicePackage: ServicePackage;
  quoteAmount: number;
  email: string;
  phone: string;
}

export async function createQuoteRequest(input: NewQuoteRequest): Promise<QuoteRequestRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("quote_requests")
    .insert({
      country: input.country,
      education_level: input.educationLevel,
      package: input.servicePackage,
      quote_amount: input.quoteAmount,
      email: input.email,
      phone: input.phone,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Không lưu được yêu cầu báo giá: ${error?.message}`);
  }
  return data;
}

export async function updateQuoteRequestStatus(
  id: string,
  status: QuoteRequestStatus,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
  if (error) {
    throw new Error(`Không cập nhật được trạng thái: ${error.message}`);
  }
}

export async function listQuoteRequests(): Promise<QuoteRequestRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("quote_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase listQuoteRequests error:", error);
    return [];
  }
  return data ?? [];
}
