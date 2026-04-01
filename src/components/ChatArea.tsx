import { useRef, useEffect } from "react";
import { Streamdown } from "streamdown";

interface ChatAreaProps {
    messages: any[];
    connected: boolean;
    status: string;
    input: string;
    setInput: (input: string) => void;
    send: () => void;
    stop: () => void;
    handleRestart: () => void;
    isGameOver: boolean;
}

export default function ChatArea({ messages, connected, status, input, setInput, send, stop, handleRestart, isGameOver }: ChatAreaProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isStreaming = status === "streaming" || status === "submitted";

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <main className="main-content">
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    width: "100%",
                    padding: "15px",
                    display: "flex",
                    justifyContent: "space-between",
                    zIndex: 10,
                    pointerEvents: "none",
                }}
            >
                <div
                    style={{
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        backgroundColor: connected ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                        color: connected ? "var(--success-color)" : "var(--danger-color)",
                        border: `1px solid ${connected ? "var(--success-color)" : "var(--danger-color)"}`,
                        pointerEvents: "auto",
                    }}
                >
                    {connected ? "● LIVE" : "○ OFFLINE"}
                </div>
                <button onClick={handleRestart} className="btn-outline" style={{ fontSize: "10px", padding: "6px 12px", pointerEvents: "auto" }}>
                    Restart
                </button>
            </div>

            <div className="chat-messages hide-scrollbar">
                {messages.length === 0 && <div style={{ flex: 1, display: "flex", alignItems: "center", justifyCenter: "center", color: "var(--text-secondary)", fontStyle: "italic" }}>The Dungeon Master awaits your first move...</div>}
                {messages.map((m) => {
                    const isUser = m.role === "user";
                    return (
                        <div key={m.id} className={`message ${isUser ? "message-user" : "message-agent"}`}>
                            {m.parts.map((part, i) => {
                                if (part.type === "text") {
                                    return (
                                        <Streamdown key={i} controls={false}>
                                            {part.text}
                                        </Streamdown>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    );
                })}
                {isStreaming && messages[messages.length - 1]?.role === "user" && (
                    <div className="message message-agent" style={{ opacity: 0.7 }}>
                        Thinking...
                    </div>
                )}
                {isGameOver && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "40px 20px",
                            textAlign: "center",
                            backgroundColor: "rgba(0,0,0,0.3)",
                            borderRadius: "12px",
                            margin: "20px 0",
                            border: "1px solid var(--danger-color)",
                        }}
                    >
                        <h2 style={{ color: "var(--danger-color)", marginBottom: "10px", fontSize: "1.5rem" }}>GAME OVER</h2>
                        <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>Your journey has come to an end.</p>
                        <button onClick={handleRestart} className="btn-primary" style={{ padding: "12px 24px" }}>
                            Restart Adventure
                        </button>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        send();
                    }}
                    className="input-form"
                >
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={isGameOver ? "Game Over." : "What do you do?"} disabled={isGameOver} autoComplete="off" />
                    {isStreaming ? (
                        <button type="button" onClick={stop} className="btn-danger">
                            Stop
                        </button>
                    ) : (
                        <button type="submit" className="btn-primary" disabled={!input.trim() || !connected}>
                            Send
                        </button>
                    )}
                </form>
            </div>
        </main>
    );
}
