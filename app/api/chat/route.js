import { NextResponse } from "next/server";

const MODEL = "gemini-3.8-flash";

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured yet." }, { status: 500 });
    }

    const { messages = [] } = await request.json();
    if (!messages.length) {
      return NextResponse.json({ error: "Please enter a message." }, { status: 400 });
    }

    const contents = messages
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content.slice(0, 20000) }]
      }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are CHALU, a helpful and intelligent AI assistant. Be clear, practical, and concise. Match the user's language when appropriate."
            }]
          },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || `Gemini request failed (${response.status}).` },
        { status: response.status }
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    if (!text) return NextResponse.json({ error: "Gemini returned an empty response." }, { status: 502 });

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Unexpected server error." }, { status: 500 });
  }
}
