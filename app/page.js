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
  const bottomRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("chalu-messages") || "[]");
      if (Array.isArray(saved)) setMessages(saved);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("chalu-messages", JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  async function sendMessage(text = input) {
    const value = text.trim();
    if (!value || loading) return;

    const next = [...messages, { role: "user", content: value }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");
      setMessages((m) => [...m, { role: "assistant", content: data.text }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ " + err.message }]);
    } finally {
      setLoading(false);
    }
  }

  function newChat() {
    setMessages([]);
    setInput("");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <div className="brand-name">CHALU</div>
            <div className="brand-sub">INTELLIGENCE, REFINED.</div>
          </div>
        </div>

        <button className="new-chat" onClick={newChat}>＋ New conversation</button>

        <div className="side-section">
          <div className="side-label">WORKSPACE</div>
          <div className="side-item active">✦ &nbsp; AI Assistant</div>
          <div className="side-item">◌ &nbsp; Coming soon</div>
          <div className="side-item">⌁ &nbsp; Coming soon</div>
        </div>

        <div className="sidebar-bottom">
          <div className="status"><span className="dot" /> Gemini connected</div>
          <button className="theme" onClick={() => setDark(!dark)}>
            {dark ? "☼  Light mode" : "☾  Dark mode"}
          </button>
        </div>
      </aside>

      <section className="chat">
        <header className="topbar">
          <div>
            <b>AI Assistant</b>
            <small>Private workspace · CHALU</small>
          </div>
          <div className="avatar">S</div>
        </header>

        <div className="conversation">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="orb">C</div>
              <div className="eyebrow">WELCOME TO CHALU</div>
              <h1>Think deeper.<br /><em>Move faster.</em></h1>
              <p>A premium AI workspace for ideas, writing, planning, analysis, and everyday questions.</p>

              <div className="prompts">
                {prompts.map((p) => (
                  <button key={p} onClick={() => sendMessage(p)}>
                    <span>↗</span>{p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((m, i) => (
                <div className={"message " + m.role} key={i}>
                  <div className="message-avatar">{m.role === "user" ? "S" : "C"}</div>
                  <div>
                    <div className="name">{m.role === "user" ? "You" : "CHALU"}</div>
                    <div className="text">{m.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="message assistant">
                  <div className="message-avatar">C</div>
                  <div><div className="name">CHALU</div><div className="typing">● ● ●</div></div>
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Message CHALU..."
              rows={1}
            />
            <div className="composer-bottom">
              <span>Enter to send · Shift + Enter for new line</span>
              <button onClick={() => sendMessage()} disabled={!input.trim() || loading}>↑</button>
            </div>
          </div>
          <div className="disclaimer">CHALU can make mistakes. Check important information before relying on it.</div>
        </div>
      </section>
    </main>
  );
}
