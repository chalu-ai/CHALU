"use client";

import { useEffect, useRef, useState } from "react";

const prompts = [
  "Explain a difficult topic in simple language.",
  "Help me write a professional email.",
  "Give me a practical plan for learning a new skill.",
  "Analyze this idea and suggest improvements."
];

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);
  const [copied, setCopied] = useState(null);
  const [lastUserMessage, setLastUserMessage] = useState("");
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
      localStorage.setItem("chalu-messages", JSON.stringify(messages));
    } catch {}

    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  async function sendMessage(text = input) {
    const value = text.trim();

    if (!value || loading) return;

    setError("");
    setLastUserMessage(value);

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
        throw new Error(data.error || "Request failed.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.text
        }
      ]);
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }

      const message = err?.message || "Something went wrong.";

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
    setLoading(false);
  }

  function newChat() {
    stopGenerating();
    setMessages([]);
    setInput("");
    setError("");
    setLastUserMessage("");

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

  async function regenerate(index) {
    if (loading) return;

    const previousUser = [...messages]
      .slice(0, index)
      .reverse()
      .find((m) => m.role === "user");

    if (!previousUser) return;

    const history = messages.slice(0, index);

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
        throw new Error(data.error || "Request failed.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.text
        }
      ]);
    } catch (err) {
      if (err.name === "AbortError") return;

      const message = err?.message || "Something went wrong.";

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

  function renderText(text) {
    if (!text) return null;

    const lines = text.split("\n");

    return lines.map((line, i) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return <div className="text-space" key={i} />;
      }

      if (/^#{1,6}\s/.test(trimmed)) {
        return (
          <div className="formatted-heading" key={i}>
            {trimmed.replace(/^#{1,6}\s/, "")}
          </div>
        );
      }

      if (/^[-*]\s/.test(trimmed)) {
        return (
          <div className="formatted-list" key={i}>
            <span>•</span>
            <span>{trimmed.replace(/^[-*]\s/, "")}</span>
          </div>
        );
      }

      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <div className="formatted-list" key={i}>
            <span>{trimmed.match(/^\d+\./)?.[0]}</span>
            <span>{trimmed.replace(/^\d+\.\s/, "")}</span>
          </div>
        );
      }

      return (
        <div key={i} className="formatted-line">
          {trimmed}
        </div>
      );
    });
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>

          <div>
            <div className="brand-name">CHALU</div>
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

          <div className="avatar">S</div>
        </header>

        <div className="conversation">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="orb">C</div>

              <div className="eyebrow">
                WELCOME TO CHALU
              </div>

              <h1>
                Think deeper.
                <br />
                <em>Move faster.</em>
              </h1>

              <p>
                A premium AI workspace for ideas,
                writing, planning, analysis, and
                everyday questions.
              </p>

              <div className="prompts">
                {prompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
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
                  className={"message " + m.role}
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
                      {m.role === "assistant"
                        ? renderText(m.content)
                        : m.content}
                    </div>

                    {m.role === "assistant" &&
                      !m.content.startsWith("⚠️") && (
                        <div className="message-actions">
                          <button
                            onClick={() =>
                              copyMessage(m.content, i)
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
                Enter to send · Shift + Enter for
                new line
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
                  onClick={() => sendMessage()}
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
            CHALU can make mistakes. Check important
            information before relying on it.
          </div>
        </div>
      </section>
    </main>
  );
}
