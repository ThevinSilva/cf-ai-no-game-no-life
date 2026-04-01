import { Suspense, useCallback, useState, useEffect } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { GameState } from "./types/game";

import PlayerSheet from "./components/PlayerSheet";
import ChatArea from "./components/ChatArea";
import EnvironmentPanel from "./components/EnvironmentPanel";
import SetupScreen from "./components/SetupScreen";

function GameDashboard() {
    const [connected, setConnected] = useState(false);
    const [input, setInput] = useState("");
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [showSetup, setShowSetup] = useState(false);

    const agent = useAgent({
        agent: "ChatAgent",
        onOpen: useCallback(() => setConnected(true), []),
        onClose: useCallback(() => setConnected(false), []),
        onError: useCallback((error: Event) => console.error("WebSocket error:", error), []),
        onStateUpdate: useCallback((mirroredState: GameState) => {
            console.log("State Sync:", mirroredState);
            setGameState(mirroredState);

            // Explicit status-based setup logic
            if (mirroredState && mirroredState.status === "setup") {
                setShowSetup(true);
            } else if (mirroredState && mirroredState.player) {
                setShowSetup(false);
            }
        }, []),
    });

    const { messages, sendMessage, status, clearHistory, stop } = useAgentChat({
        agent,
    });

    const isStreaming = status === "streaming" || status === "submitted";

    const send = useCallback(() => {
        const text = input.trim();
        if (!text || isStreaming) return;
        setInput("");
        sendMessage({ role: "user", parts: [{ type: "text", text }] });
    }, [input, isStreaming, sendMessage]);

    const handleQuickAction = (actionText: string) => {
        if (isStreaming || !connected || gameState?.flags?.isGameOver) return;
        sendMessage({ role: "user", parts: [{ type: "text", text: actionText }] });
    };

    const handleRestart = async () => {
        if (window.confirm("Are you sure you want to abandon this run?")) {
            // Tell the server to reset everything
            await agent.call("reset");
            clearHistory();
            setGameState(null);
            setShowSetup(true);
        }
    };

    const handleStartGame = async (config: any) => {
        clearHistory();
        setShowSetup(false); // Hide immediately to show "Initializing World..."
        await agent.call("startGame", [config]);
    };

    if (showSetup) {
        return <SetupScreen onStart={handleStartGame} />;
    }

    if (!gameState) {
        return (
            <div className="game-container" style={{ alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <h2 style={{ color: "var(--accent-color)", animation: "pulse 2s infinite" }}>Initializing World...</h2>
                    <p style={{ color: "var(--text-secondary)" }}>The LLM is weaving your destiny.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="game-container">
            <PlayerSheet gameState={gameState} handleQuickAction={handleQuickAction} />

            <ChatArea messages={messages} connected={connected} status={status} input={input} setInput={setInput} send={send} stop={stop} handleRestart={handleRestart} isGameOver={!!gameState.flags?.isGameOver} />

            <EnvironmentPanel gameState={gameState} handleQuickAction={handleQuickAction} />
        </div>
    );
}

export default function App() {
    return (
        <Suspense
            fallback={
                <div className="game-container" style={{ alignItems: "center", justifyContent: "center" }}>
                    <div style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>Booting Engine...</div>
                </div>
            }
        >
            <GameDashboard />
        </Suspense>
    );
}
