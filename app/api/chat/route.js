import { NextResponse } from "next/server";

const MODEL = "gemini-3.8-flash";

const SYSTEM_PROMPT = `
You are CHALU, a helpful, intelligent and reliable AI assistant.

Rules:
- Give clear and useful answers.
- Match the user's language.
- If the user writes Bangla, reply naturally in Bangla.
- If the user writes Banglish, you may reply in Banglish.
- Maintain the conversation context.
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

    const validMessages = messages.filter(
      (message) =>
        (message.role === "user" ||
          message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim()
    );

    const input = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: SYSTEM_PROMPT
          }
        ]
      },
      ...validMessages.map((message) => ({
        role:
          message.role === "assistant"
            ? "model"
            : "user",
        content: [
          {
            type: "text",
            text: message.content
              .trim()
              .slice(0, 12000)
          }
        ]
      }))
    ];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          model: MODEL,
          input
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
            data?.message ||
            `Gemini returned HTTP ${response.status}.`
        },
        { status: response.status }
      );
    }

    const text =
      data?.outputs
        ?.filter(
          (output) =>
            output?.type === "text"
        )
        ?.map(
          (output) =>
            output?.text || ""
        )
        ?.join("")
        ?.trim() ||
      data?.output_text?.trim() ||
      "";

    if (!text) {
      return NextResponse.json(
        {
          error:
            "Gemini returned an empty response."
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
