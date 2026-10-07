import { NextResponse } from "next/server";

const MODEL = "gemini-3.8-flash";

const SYSTEM_PROMPT = `
You are CHALU, a helpful and intelligent AI assistant.

Answer clearly and accurately.
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

    const steps = [];

    for (const message of messages) {
      if (
        !message ||
        typeof message.content !== "string" ||
        !message.content.trim()
      ) {
        continue;
      }

      steps.push({
        type: "text",
        text: message.content.trim().slice(0, 12000)
      });
    }

    if (!steps.length) {
      return NextResponse.json(
        { error: "No valid message found." },
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

          system_instruction: SYSTEM_PROMPT,

          input: {
            type: "step_list",
            steps
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

    if (Array.isArray(data?.outputs)) {
      text = data.outputs
        .filter(
          (item) =>
            item?.type === "text" &&
            typeof item?.text === "string"
        )
        .map((item) => item.text)
        .join("")
        .trim();
    }

    if (!text && typeof data?.output_text === "string") {
      text = data.output_text.trim();
    }

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
