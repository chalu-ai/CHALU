import { NextResponse } from "next/server";

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
];

const SYSTEM_PROMPT = `
You are CHALU, a helpful, intelligent and reliable AI assistant.

Your goals:
- Give clear, useful and practical answers.
- Match the user's language. If the user writes Bangla, reply naturally in Bangla.
- If the user writes Banglish, you may reply in Banglish when appropriate.
- Be concise when the question is simple and detailed when the question requires it.
- Do not pretend to know something you do not know.
- For important or uncertain information, clearly mention uncertainty.
- Maintain the context of the current conversation.
`;

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured yet." },
        { status: 500 }
      );
    }

    const { messages = [] } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Please enter a message." },
        { status: 400 }
      );
    }

    const contents = messages
      .filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      )
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [
          {
            text: m.content.slice(0, 20000),
          },
        ],
      }));

    if (!contents.length) {
      return NextResponse.json(
        { error: "Please enter a message." },
        { status: 400 }
      );
    }

    let lastError = "Gemini request failed.";

    for (const model of MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
            apiKey
          )}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }],
              },
              contents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
              },
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          lastError =
            data?.error?.message ||
            `Gemini request failed (${response.status}).`;

          // Try the next model for temporary availability/rate-limit errors.
          if (
            response.status === 429 ||
            response.status === 500 ||
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504
          ) {
            continue;
          }

          return NextResponse.json(
            { error: lastError },
            { status: response.status }
          );
        }

        const text = data?.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("")
          .trim();

        if (text) {
          return NextResponse.json({
            text,
            model,
          });
        }

        lastError = "Gemini returned an empty response.";
      } catch (error) {
        lastError = error?.message || "Unexpected Gemini error.";
      }
    }

    return NextResponse.json(
      {
        error:
          "CHALU is temporarily unable to reach Gemini. Please try again in a moment.",
        details: lastError,
      },
      { status: 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
