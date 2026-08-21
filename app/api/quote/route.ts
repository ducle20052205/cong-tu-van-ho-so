import { NextResponse } from "next/server";
import { createQuoteRequest, type EducationLevel } from "@/lib/quote-store";
import type { ServicePackage } from "@/lib/mock-data";

// The one authoritative price table — never trust a price sent by the client.
const PACKAGE_PRICES: Record<ServicePackage, number> = {
  co_ban: 15_000_000,
  toan_dien: 30_000_000,
};

const VALID_EDUCATION_LEVELS: EducationLevel[] = ["thpt", "dai_hoc", "thac_si"];
const VALID_PACKAGES: ServicePackage[] = ["co_ban", "toan_dien"];

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const country = typeof body.country === "string" ? body.country.trim() : "";
  const educationLevel = body.educationLevel as EducationLevel;
  const servicePackage = body.servicePackage as ServicePackage;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (!country || !email || !phone) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc." }, { status: 400 });
  }
  if (!VALID_EDUCATION_LEVELS.includes(educationLevel)) {
    return NextResponse.json({ error: "Bậc học không hợp lệ." }, { status: 400 });
  }
  if (!VALID_PACKAGES.includes(servicePackage)) {
    return NextResponse.json({ error: "Gói dịch vụ không hợp lệ." }, { status: 400 });
  }

  const quoteAmount = PACKAGE_PRICES[servicePackage];

  try {
    await createQuoteRequest({
      country,
      educationLevel,
      servicePackage,
      quoteAmount,
      email,
      phone,
    });
  } catch (err) {
    console.error("Lỗi lưu yêu cầu báo giá:", err);
    return NextResponse.json({ error: "Không lưu được yêu cầu báo giá." }, { status: 500 });
  }

  return NextResponse.json({ quote: quoteAmount });
}
