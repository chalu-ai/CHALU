import { NextResponse } from "next/server";

const MODEL = "gemini-3.8-flash";

const SYSTEM_INSTRUCTION = `
You are CHALU, a helpful and intelligent AI assistant.

Give clear and useful answers.
Match the user's language.
If the user writes Bangla, answer naturally in Bangla.
If the user writes Banglish, you may answer in Banglish.
Maintain conversation context.
Use Markdown when useful.
`;

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Gemini API key is not configured."
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

    const input = [];

    for (const message of messages) {
      if (
        !message ||
        typeof message.content !== "string" ||
        !message.content.trim()
      ) {
        continue;
      }

      if (message.role === "user") {
        input.push({
          type: "user_input",
          content: [
            {
              type: "text",
              text: message.content
                .trim()
                .slice(0, 12000)
            }
          ]
        });
      }

      if (message.role === "assistant") {
        input.push({
          type: "model_output",
          content: [
            {
              type: "text",
              text: message.content
                .trim()
                .slice(0, 12000)
            }
          ]
        });
      }
    }

    if (!input.length) {
      return NextResponse.json(
        {
          error: "No valid message found."
        },
        { status: 400 }
      );
    }

    // Remove anything before the first user message.
    const firstUserIndex = input.findIndex(
      (item) => item.type === "user_input"
    );

    const history =
      firstUserIndex >= 0
        ? input.slice(firstUserIndex)
        : [];

    if (!history.length) {
      return NextResponse.json(
        {
          error: "No user message found."
        },
        { status: 400 }
      );
    }

    // The last item must be the user's new message.
    if (
      history[history.length - 1].type !==
      "user_input"
    ) {
      history.pop();
    }

    if (!history.length) {
      return NextResponse.json(
        {
          error: "No current user message found."
        },
        { status: 400 }
      );
    }

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
          system_instruction:
            SYSTEM_INSTRUCTION,
          input: history,
          generation_config: {
            max_output_tokens: 2048,
            thinking_level: "low"
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
            data?.message ||
            `Gemini returned HTTP ${response.status}.`
        },
        { status: response.status }
      );
    }

    let text = "";

    if (Array.isArray(data?.steps)) {
      const outputStep = [...data.steps]
        .reverse()
        .find(
          (step) =>
            step?.type === "model_output"
        );

      if (Array.isArray(outputStep?.content)) {
        text = outputStep.content
          .filter(
            (part) =>
              part?.type === "text" &&
              typeof part?.text === "string"
          )
          .map((part) => part.text)
          .join("")
          .trim();
      }
    }

    if (
      !text &&
      typeof data?.output_text === "string"
    ) {
      text = data.output_text.trim();
    }

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
