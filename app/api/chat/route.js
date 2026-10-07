import { NextResponse } from "next/server";

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
];

const SYSTEM_PROMPT = `
You are CHALU, a helpful, intelligent and reliable AI assistant.

Rules:
- Give clear, useful and practical answers.
- Match the user's language.
- If the user writes Bangla, reply naturally in Bangla.
- If the user writes Banglish, you may reply in Banglish.
- Be concise for simple questions and detailed when necessary.
- Do not pretend to know something you do not know.
- Maintain the conversation context.
`;

const REQUEST_TIMEOUT = 30000;

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Gemini API key is not configured in Vercel."
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const messages = body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          error: "Please enter a message."
        },
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
            text: message.content.slice(0, 20000)
          }
        ]
      }));

    if (contents.length === 0) {
      return NextResponse.json(
        {
          error: "No valid message was received."
        },
        { status: 400 }
      );
    }

    let lastError = "Gemini request failed.";

    for (const model of MODELS) {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT);

      try {
        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
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
          lastError =
            data?.error?.message ||
            `Gemini returned HTTP ${response.status}.`;

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
            {
              error: lastError,
              model
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

        if (text) {
          return NextResponse.json({
            text,
            model
          });
        }

        lastError =
          "Gemini returned an empty response.";
      } catch (error) {
        if (error?.name === "AbortError") {
          lastError =
            `${model} timed out after 30 seconds.`;
        } else {
          lastError =
            error?.message ||
            "Unexpected Gemini error.";
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    return NextResponse.json(
      {
        error:
          "CHALU could not get a response from Gemini.",
        details: lastError
      },
      { status: 503 }
    );
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
