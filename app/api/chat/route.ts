import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { appendMessage, ensureConversation, getConversationMessages } from "@/lib/chat-store";

const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CONVERSATION_COOKIE = "chat_conversation_id";
const CONVERSATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

const SYSTEM_INSTRUCTION = `## Persona
Bạn là Trợ lý AI Tư vấn Du học — một trợ lý ảo thân thiện, nhiệt tình, hỗ trợ học sinh/phụ huynh tìm hiểu về du học.

## Core Task/Objective
💬 Nhiệm vụ của bạn là dẫn dắt cuộc trò chuyện có cấu trúc để hiểu nhu cầu du học của người dùng, thu thập thông tin liên hệ và giới thiệu dịch vụ tư vấn phù hợp. Trả lời ngắn gọn, hữu ích.
💬 Trả lời bằng đúng ngôn ngữ người dùng đang sử dụng.
💬 Mỗi lượt chỉ hỏi một câu hỏi.

## Constraints/Rules
⚠️ QUY TẮC KHÁC:
- Không đề cập chi phí/học phí trừ khi người dùng chủ động hỏi
- Không tự đưa ra cam kết về tỷ lệ đậu visa hoặc học bổng

## Additional Information
🧠 LUỒNG HỘI THOẠI:
1. Hỏi người dùng đang quan tâm du học nước nào (hoặc đang phân vân giữa các nước)
2. Hỏi về mục tiêu/bậc học (THPT, Đại học, Thạc sĩ...) và ngành học quan tâm
3. Dựa trên nhu cầu, giới thiệu dịch vụ tư vấn phù hợp (chọn trường, hồ sơ, xin visa, học bổng...)
4. Hỏi họ có muốn tìm hiểu thêm chi tiết không
5. Nếu có, thu thập lần lượt: họ tên → email → số điện thoại
6. Sau đó, cung cấp thông tin chi tiết hơn về quy trình tư vấn và mời đặt lịch tư vấn miễn phí
7. Hỏi họ có ghi chú/câu hỏi nào khác trước khi kết thúc

## Dịch vụ
Tư vấn chọn trường & ngành học, hỗ trợ hồ sơ apply, tư vấn xin visa, tìm học bổng, đào tạo kỹ năng trước khi du học (ngôn ngữ, phỏng vấn).
Trụ sở: Số 1 Hai Bà Trưng, Hà Nội
Liên hệ: 0912 345 6789

## Configuration
- Mục tiêu: Thu thập lead và đặt lịch tư vấn
- Phong cách trả lời: Cân bằng, đi thẳng vào trọng tâm, tối đa 2-3 câu mỗi lượt trừ khi cần chi tiết hơn`;

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

/** GET: hydrate the widget with this visitor's persisted conversation, if any. */
export async function GET() {
  const cookieStore = await cookies();
  const conversationId = cookieStore.get(CONVERSATION_COOKIE)?.value;

  if (!conversationId) {
    return NextResponse.json({ messages: [] });
  }

  const rows = await getConversationMessages(conversationId);
  const messages = rows.map((r) => ({ from: r.role, text: r.content }));
  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chưa cấu hình GEMINI_API_KEY trên server." },
      { status: 500 },
    );
  }

  let body: { message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Thiếu nội dung tin nhắn." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const existingConversationId = cookieStore.get(CONVERSATION_COOKIE)?.value;
  const conversationId = await ensureConversation(existingConversationId);
  if (conversationId !== existingConversationId) {
    cookieStore.set(CONVERSATION_COOKIE, conversationId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CONVERSATION_COOKIE_MAX_AGE,
    });
  }

  // History comes only from the server's own record of this conversation —
  // never trust a client-supplied history array.
  const priorMessages = await getConversationMessages(conversationId);
  const historyContents: GeminiContent[] = priorMessages.slice(-20).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));

  // Gemini requires the conversation to start with a "user" turn — drop any
  // leading bot messages (e.g. a very first stored greeting) before sending.
  const firstUserIndex = historyContents.findIndex((c) => c.role === "user");
  const trimmedHistory = firstUserIndex === -1 ? [] : historyContents.slice(firstUserIndex);

  const contents: GeminiContent[] = [
    ...trimmedHistory,
    { role: "user" as const, parts: [{ text: message }] },
  ];

  await appendMessage(conversationId, "user", message);

  const callGemini = () =>
    fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
      }),
    });

  try {
    let res = await callGemini();

    // Gemini's free tier occasionally returns transient 429/503 under load — retry once.
    if (!res.ok && (res.status === 429 || res.status === 503)) {
      await new Promise((r) => setTimeout(r, 800));
      res = await callGemini();
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      return NextResponse.json(
        { error: "Không gọi được Gemini API." },
        { status: 502 },
      );
    }

    const data = await res.json();
    const reply: string | undefined = data?.candidates?.[0]?.content?.parts
      ?.map((p: GeminiPart) => p.text)
      .join("")
      ?.trim();

    if (!reply) {
      return NextResponse.json(
        { error: "Gemini không trả về nội dung." },
        { status: 502 },
      );
    }

    await appendMessage(conversationId, "bot", reply);

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Gemini API request failed:", err);
    return NextResponse.json({ error: "Có lỗi khi gọi Gemini API." }, { status: 500 });
  }
}
