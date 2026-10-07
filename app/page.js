"use client";

import { useEffect, useRef, useState } from "react";

const prompts = [
  "Explain a difficult topic in simple language.",
  "Help me write a professional email.",
  "Give me a practical plan for learning a new skill.",
  "Analyze this idea and suggest improvements."
];

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatInline(text) {
  let value = escapeHtml(text);

  value = value.replace(
    /`([^`]+)`/g,
    '<code class="inline-code">$1</code>'
  );

  value = value.replace(
    /\*\*([^*]+)\*\*/g,
    "<strong>$1</strong>"
  );

  value = value.replace(
    /__([^_]+)__/g,
    "<strong>$1</strong>"
  );

  value = value.replace(
    /(?<!\*)\*([^*]+)\*(?!\*)/g,
    "<em>$1</em>"
  );

  value = value.replace(
    /(?<!_)_([^_]+)_(?!_)/g,
    "<em>$1</em>"
  );

  value = value.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  value = value.replace(
    /(^|[\s>])(https?:\/\/[^\s<]+)/g,
    '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
  );

  return value;
}

function MarkdownTable({ lines }) {
  if (lines.length < 2) return null;

  const parseRow = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  const headers = parseRow(lines[0]);

  const rows = lines
    .slice(2)
    .filter(Boolean)
    .map(parseRow);

  return (
    <div className="table-wrapper">
      <table className="markdown-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>
                <span
                  dangerouslySetInnerHTML={{
                    __html: formatInline(header)
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map((_, cellIndex) => (
                <td key={cellIndex}>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: formatInline(
                        row[cellIndex] || ""
                      )
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderText(text, onCopyCode) {
  if (!text) return null;

  const lines = text.replace(/\r/g, "").split("\n");
  const output = [];

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const language =
        line.trim().replace(/^```/, "").trim() ||
        "code";

      const codeLines = [];
      i++;

      while (
        i < lines.length &&
        !lines[i].trim().startsWith("```")
      ) {
        codeLines.push(lines[i]);
        i++;
      }

      const code = codeLines.join("\n");

      output.push(
        <div className="code-block" key={`code-${i}`}>
          <div className="code-header">
            <span>{language}</span>

            <button
              onClick={() => onCopyCode(code)}
              type="button"
            >
              ⧉ Copy code
            </button>
          </div>

          <pre>
            <code>{code}</code>
          </pre>
        </div>
      );

      i++;
      continue;
    }

    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(
        lines[i + 1]
      )
    ) {
      const tableLines = [line, lines[i + 1]];
      i += 2;

      while (
        i < lines.length &&
        lines[i].includes("|") &&
        lines[i].trim()
      ) {
        tableLines.push(lines[i]);
        i++;
      }

      output.push(
        <MarkdownTable
          key={`table-${i}`}
          lines={tableLines}
        />
      );

      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      output.push(
        <div
          className="text-space"
          key={`space-${i}`}
        />
      );

      i++;
      continue;
    }

    if (/^#{1,6}\s/.test(trimmed)) {
      const heading = trimmed.replace(
        /^#{1,6}\s/,
        ""
      );

      output.push(
        <div
          className="formatted-heading"
          key={`heading-${i}`}
          dangerouslySetInnerHTML={{
            __html: formatInline(heading)
          }}
        />
      );

      i++;
      continue;
    }

    if (/^[-*+]\s/.test(trimmed)) {
      const content = trimmed.replace(
        /^[-*+]\s/,
        ""
      );

      output.push(
        <div
          className="formatted-list"
          key={`bullet-${i}`}
        >
          <span>•</span>

          <span
            dangerouslySetInnerHTML={{
              __html: formatInline(content)
            }}
          />
        </div>
      );

      i++;
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const number =
        trimmed.match(/^\d+\./)?.[0] || "";

      const content = trimmed.replace(
        /^\d+\.\s/,
        ""
      );

      output.push(
        <div
          className="formatted-list"
          key={`number-${i}`}
        >
          <span>{number}</span>

          <span
            dangerouslySetInnerHTML={{
              __html: formatInline(content)
            }}
          />
        </div>
      );

      i++;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote = trimmed.replace(
        /^>\s?/,
        ""
      );

      output.push(
        <div
          className="formatted-quote"
          key={`quote-${i}`}
          dangerouslySetInnerHTML={{
            __html: formatInline(quote)
          }}
        />
      );

      i++;
      continue;
    }

    output.push(
      <div
        className="formatted-line"
        key={`line-${i}`}
        dangerouslySetInnerHTML={{
          __html: formatInline(trimmed)
        }}
      />
    );

    i++;
  }

  return output;
}

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("chalu-messages") || "[]"
      );

      if (Array.isArray(saved)) {
        setMessages(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "chalu-messages",
        JSON.stringify(messages)
      );
    } catch {}

    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  useEffect(() => {
    document.documentElement.dataset.theme =
      dark ? "dark" : "light";
  }, [dark]);

  async function sendMessage(text = input) {
    const value = text.trim();

    if (!value || loading) return;

    setError("");

    const next = [
      ...messages,
      {
        role: "user",
        content: value
      }
    ];

    setMessages(next);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: next
        }),
        signal: controller.signal
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Request failed."
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.text
        }
      ]);
    } catch (err) {
      if (err?.name === "AbortError") return;

      const message =
        err?.message ||
        "Something went wrong.";

      setError(message);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "⚠️ " + message
        }
      ]);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function stopGenerating() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }

  function newChat() {
    stopGenerating();

    setMessages([]);
    setInput("");
    setError("");
    setCopied(null);

    try {
      localStorage.removeItem("chalu-messages");
    } catch {}
  }

  async function copyMessage(text, index) {
    try {
      await navigator.clipboard.writeText(text);

      setCopied(index);

      setTimeout(() => {
        setCopied(null);
      }, 1500);
    } catch {}
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {}
  }

  async function regenerate(index) {
    if (loading) return;

    const assistantMessage = messages[index];

    if (
      !assistantMessage ||
      assistantMessage.role !== "assistant"
    ) {
      return;
    }

    const userIndex = [...messages]
      .slice(0, index)
      .map((message, position) => ({
        ...message,
        position
      }))
      .reverse()
      .find(
        (message) =>
          message.role === "user"
      )?.position;

    if (userIndex === undefined) return;

    const history = messages.slice(
      0,
      userIndex + 1
    );

    setMessages(history);
    setLoading(true);
    setError("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: history
        }),
        signal: controller.signal
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Request failed."
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.text
        }
      ]);
    } catch (err) {
      if (err?.name === "AbortError") return;

      const message =
        err?.message ||
        "Something went wrong.";

      setError(message);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "⚠️ " + message
        }
      ]);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>

          <div>
            <div className="brand-name">
              CHALU
            </div>

            <div className="brand-sub">
              INTELLIGENCE, REFINED.
            </div>
          </div>
        </div>

        <button
          className="new-chat"
          onClick={newChat}
        >
          ＋ New conversation
        </button>

        <div className="side-section">
          <div className="side-label">
            WORKSPACE
          </div>

          <div className="side-item active">
            ✦ &nbsp; AI Assistant
          </div>

          <div className="side-item">
            ◌ &nbsp; Coming soon
          </div>

          <div className="side-item">
            ⌁ &nbsp; Coming soon
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="status">
            <span className="dot" />
            Gemini connected
          </div>

          <button
            className="theme"
            onClick={() => setDark(!dark)}
          >
            {dark
              ? "☼  Light mode"
              : "☾  Dark mode"}
          </button>
        </div>
      </aside>

      <section className="chat">
        <header className="topbar">
          <div>
            <b>AI Assistant</b>

            <small>
              Private workspace · CHALU
            </small>
          </div>

          <div className="avatar">
            S
          </div>
        </header>

        <div className="conversation">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="orb">
                C
              </div>

              <div className="eyebrow">
                WELCOME TO CHALU
              </div>

              <h1>
                Think deeper.
                <br />
                <em>Move faster.</em>
              </h1>

              <p>
                A premium AI workspace for
                ideas, writing, planning,
                analysis, and everyday
                questions.
              </p>

              <div className="prompts">
                {prompts.map((p) => (
                  <button
                    key={p}
                    onClick={() =>
                      sendMessage(p)
                    }
                  >
                    <span>↗</span>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((m, i) => (
                <div
                  className={
                    "message " + m.role
                  }
                  key={i}
                >
                  <div className="message-avatar">
                    {m.role === "user"
                      ? "S"
                      : "C"}
                  </div>

                  <div className="message-content">
                    <div className="name">
                      {m.role === "user"
                        ? "You"
                        : "CHALU"}
                    </div>

                    <div className="text">
                      {m.role ===
                      "assistant"
                        ? renderText(
                            m.content,
                            copyCode
                          )
                        : m.content}
                    </div>

                    {m.role ===
                      "assistant" &&
                      !m.content.startsWith(
                        "⚠️"
                      ) && (
                        <div className="message-actions">
                          <button
                            onClick={() =>
                              copyMessage(
                                m.content,
                                i
                              )
                            }
                            title="Copy answer"
                          >
                            {copied === i
                              ? "✓ Copied"
                              : "⧉ Copy"}
                          </button>

                          <button
                            onClick={() =>
                              regenerate(i)
                            }
                            disabled={loading}
                            title="Regenerate answer"
                          >
                            ↻ Regenerate
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="message assistant">
                  <div className="message-avatar">
                    C
                  </div>

                  <div>
                    <div className="name">
                      CHALU
                    </div>

                    <div className="typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="composer-wrap">
          <div className="composer">
            <textarea
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Message CHALU..."
              rows={1}
              disabled={loading}
            />

            <div className="composer-bottom">
              <span>
                Enter to send · Shift + Enter
                for new line
              </span>

              {loading ? (
                <button
                  className="stop-button"
                  onClick={stopGenerating}
                  title="Stop generating"
                >
                  ■
                </button>
              ) : (
                <button
                  onClick={() =>
                    sendMessage()
                  }
                  disabled={!input.trim()}
                  title="Send message"
                >
                  ↑
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="disclaimer">
            CHALU can make mistakes. Check
            important information before
            relying on it.
          </div>
        </div>
      </section>
    </main>
  );
}
