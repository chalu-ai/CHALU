import { NextResponse } from "next/server";

const MODEL = "gemini-3.8-flash";

const SYSTEM_PROMPT = `
You are CHALU, a helpful, intelligent and reliable AI assistant.

Rules:
- Give clear, useful and practical answers.
- Match the user's language.
- If the user writes Bangla, reply naturally in Bangla.
- If the user writes Banglish, you may reply in Banglish.
- Be concise for simple questions and detailed when necessary.
- Support Markdown formatting when useful, including headings, bold text, bullet lists, numbered lists, code blocks and tables.
- Maintain the conversation context.
- Do not pretend to know something you do not know.
`;

const REQUEST_TIMEOUT = 30000;

function buildContents(messages) {
  const valid = messages
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
      text: message.content.trim().slice(0, 20000)
    }));

  const contents = [];

  for (const message of valid) {
    const last = contents[contents.length - 1];

    if (last && last.role === message.role) {
      last.parts[0].text += "\n\n" + message.text;
    } else {
      contents.push({
        role: message.role,
        parts: [
          {
            text: message.text
          }
        ]
      });
    }
  }

  // Gemini conversations should start with a user turn.
  while (
    contents.length &&
    contents[0].role !== "user"
  ) {
    contents.shift();
  }

  // Never send an incomplete trailing model turn.
  if (
    contents.length &&
    contents[contents.length - 1].role ===
      "model"
  ) {
    contents.pop();
  }

  return contents;
}

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API key is not configured in Vercel."
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const messages = body?.messages;

    if (
      !Array.isArray(messages) ||
      messages.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Please enter a message."
        },
        { status: 400 }
      );
    }

    const contents = buildContents(messages);

    if (contents.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid conversation messages were received."
        },
        { status: 400 }
      );
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT);

    try {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent` +
        `?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: controller.signal,
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
            maxOutputTokens: 4096
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data?.error?.message ||
          `Gemini returned HTTP ${response.status}.`;

        return NextResponse.json(
          {
            error: errorMessage,
            status: response.status
          },
          {
            status: response.status
          }
        );
      }

      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((part) => part?.text || "")
          .join("")
          .trim();

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
      if (error?.name === "AbortError") {
        return NextResponse.json(
          {
            error:
              "Gemini request timed out after 30 seconds."
          },
          { status: 504 }
        );
      }

      return NextResponse.json(
        {
          error:
            error?.message ||
            "Unable to connect to Gemini."
        },
        { status: 500 }
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unexpected server error."
      },
      { status: 500 }
    );
  }
}
