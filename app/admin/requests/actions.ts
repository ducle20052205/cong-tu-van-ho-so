"use server";

import { revalidatePath } from "next/cache";
import { updateQuoteRequestStatus, type QuoteRequestStatus } from "@/lib/quote-store";

export async function setQuoteRequestStatus(id: string, status: QuoteRequestStatus) {
  if (status !== "da_duyet" && status !== "tu_choi") {
    throw new Error("Trạng thái không hợp lệ.");
  }
  await updateQuoteRequestStatus(id, status);
  revalidatePath("/admin/requests");
}
