import { NextResponse } from "next/server";

const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `
You are CHALU, a helpful and intelligent AI assistant.

Rules:
- Answer clearly and accurately.
- Match the user's language.
- If the user writes Bangla, answer naturally in Bangla.
- If the user writes Banglish, you may answer in Banglish.
- Maintain conversation context.
- Use Markdown when useful.
- Support headings, bold text, bullet lists, numbered lists, code blocks and tables.
`;

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured." },
        { status: 500 }
      );
    }

    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Please enter a message." },
        { status: 400 }
      );
    }

    const contents = messages
      .filter(
        (message) =>
          (message.role === "user" ||
            message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim()
      )
      .map((message) => ({
        role:
          message.role === "assistant"
            ? "model"
            : "user",
        parts: [
          {
            text: message.content
              .trim()
              .slice(0, 12000)
          }
        ]
      }));

    if (!contents.length) {
      return NextResponse.json(
        { error: "No valid message found." },
        { status: 400 }
      );
    }

    // Make sure the conversation starts with a user message.
    while (
      contents.length > 0 &&
      contents[0].role !== "user"
    ) {
      contents.shift();
    }

    // Remove trailing model message.
    if (
      contents.length > 0 &&
      contents[contents.length - 1].role ===
        "model"
    ) {
      contents.pop();
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: SYSTEM_PROMPT
              }
            ]
          },
          contents,
          generationConfig: {
            maxOutputTokens: 2048
          }
        }),
        cache: "no-store"
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            `Gemini returned HTTP ${response.status}.`
        },
        { status: response.status }
      );
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("")
      .trim();

    if (!text) {
      return NextResponse.json(
        {
          error: "Gemini returned an empty response."
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      text,
      model: MODEL
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to connect to Gemini."
      },
      { status: 500 }
    );
  }
}
