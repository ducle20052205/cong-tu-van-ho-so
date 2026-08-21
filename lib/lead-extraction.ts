import "server-only";
import type { ChatMessageRow } from "@/lib/chat-store";
import type { ExtractedLead, LeadQuality } from "@/lib/lead-store";

const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EXTRACTION_SYSTEM_INSTRUCTION = `Bạn là hệ thống trích xuất thông tin lead từ một cuộc hội thoại giữa khách và chatbot tư vấn du học.

Dựa vào đoạn hội thoại được cung cấp, trích xuất đúng các trường theo schema JSON yêu cầu:
- name: họ tên khách (nếu khách có cung cấp).
- email, phone: thông tin liên hệ khách cung cấp.
- destination_country: quốc gia khách muốn du học.
- education_level: bậc học khách quan tâm (THPT, Đại học, Thạc sĩ...).
- major: ngành học khách quan tâm.
- availability: thời gian khách rảnh để được tư vấn/gọi lại, nếu có đề cập.
- has_booked_consultation: true nếu khách đã đồng ý/xác nhận đặt lịch tư vấn, ngược lại false.
- notes: ghi chú/câu hỏi/mong muốn đáng chú ý khác của khách, tóm tắt ngắn gọn.
- lead_quality: đánh giá chất lượng lead —
  - "good": có ít nhất email hoặc số điện thoại, và thể hiện nhu cầu du học thật sự, rõ ràng.
  - "ok": có một phần thông tin, hoặc nhu cầu chưa rõ ràng, hoặc chưa để lại thông tin liên hệ.
  - "spam": nội dung rác, thử nghiệm, quấy rối, không liên quan đến du học, hoặc rõ ràng không có giá trị.

Nếu không có thông tin cho một trường, để giá trị là chuỗi rỗng "". Không tự bịa thông tin không có trong hội thoại.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    destination_country: { type: "string" },
    education_level: { type: "string" },
    major: { type: "string" },
    availability: { type: "string" },
    has_booked_consultation: { type: "boolean" },
    notes: { type: "string" },
    lead_quality: { type: "string", enum: ["good", "ok", "spam"] },
  },
  required: [
    "name",
    "email",
    "phone",
    "destination_country",
    "education_level",
    "major",
    "availability",
    "has_booked_consultation",
    "notes",
    "lead_quality",
  ],
};

function buildTranscript(messages: ChatMessageRow[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "Khách" : "Bot"}: ${m.content}`)
    .join("\n");
}

const VALID_QUALITIES: LeadQuality[] = ["good", "ok", "spam"];

export async function extractLeadFromMessages(messages: ChatMessageRow[]): Promise<ExtractedLead> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY trên server.");
  }
  if (messages.length === 0) {
    throw new Error("Cuộc hội thoại chưa có tin nhắn nào để trích xuất.");
  }

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: EXTRACTION_SYSTEM_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text: buildTranscript(messages) }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini lead extraction error:", res.status, errText);
    throw new Error("Không gọi được Gemini để trích xuất lead.");
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini không trả về nội dung trích xuất.");
  }

  let parsed: Partial<ExtractedLead>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Không đọc được JSON trích xuất từ Gemini.");
  }

  const lead_quality: LeadQuality = VALID_QUALITIES.includes(parsed.lead_quality as LeadQuality)
    ? (parsed.lead_quality as LeadQuality)
    : "ok";

  return {
    name: typeof parsed.name === "string" ? parsed.name : "",
    email: typeof parsed.email === "string" ? parsed.email : "",
    phone: typeof parsed.phone === "string" ? parsed.phone : "",
    destination_country: typeof parsed.destination_country === "string" ? parsed.destination_country : "",
    education_level: typeof parsed.education_level === "string" ? parsed.education_level : "",
    major: typeof parsed.major === "string" ? parsed.major : "",
    availability: typeof parsed.availability === "string" ? parsed.availability : "",
    has_booked_consultation: parsed.has_booked_consultation === true,
    notes: typeof parsed.notes === "string" ? parsed.notes : "",
    lead_quality,
  };
}
