import { Suspense, useCallback, useState, useEffect, useRef } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "ai";
import { Streamdown } from "streamdown";

// ── IMPORT ECS TYPES DIRECTLY FROM BACKEND ─────────────────────────
import type { GameState, Room, Actor, Item, Skill } from "./types/game";
// ── Main Dashboard ────────────────────────────────────────────────────
function GameDashboard() {
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Connect to Agent and catch state updates
  const agent = useAgent({
    agent: "ChatAgent",
    onOpen: useCallback(() => setConnected(true), []),
    onClose: useCallback(() => setConnected(false), []),
    onError: useCallback(
      (error: Event) => console.error("WebSocket error:", error),
      []
    ),
    onStateUpdate: useCallback((mirroredState: GameState) => {
      console.log("State Sync:", mirroredState);
      setGameState(mirroredState);
    }, [])
  });

  // 2. Chat capabilities
  const { messages, sendMessage, status, stop, clearHistory } = useAgentChat({
    agent
  });
  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      clearHistory();
      await agent.call("restartGame");
    }
  };

  // ── ECS HYDRATION ─────────────────────────────────────────────────
  const currentRoomId = gameState?.currentRoomId;
  const currentRoom = currentRoomId ? gameState?.rooms[currentRoomId] : null;

  const connectedRoomIds = currentRoomId
    ? gameState?.roomNodes[currentRoomId] || []
    : [];
  const connectedRooms = connectedRoomIds
    .map((id) => gameState?.rooms[id])
    .filter(Boolean) as Room[];

  const presentActors =
    (currentRoom?.actorIds
      .map((id) => gameState?.actors[id])
      .filter(Boolean) as Actor[]) || [];
  const enemies = presentActors.filter((a) => a.isHostile);
  const npcs = presentActors.filter((a) => !a.isHostile);

  const presentItems =
    (currentRoom?.itemIds
      .map((id) => gameState?.items[id])
      .filter(Boolean) as Item[]) || [];

  // Player specific hydration
  const equippedWeapon = gameState?.player.equippedWeaponId
    ? gameState.items[gameState.player.equippedWeaponId]
    : null;
  const equippedArmor = gameState?.player.equippedArmorId
    ? gameState.items[gameState.player.equippedArmorId]
    : null;
  const playerSkills =
    (gameState?.player.skillIds
      .map((id) => gameState.skills[id])
      .filter(Boolean) as Skill[]) || [];

  const xpThreshold = (gameState?.player?.level || 1) * 100;
  const isGameOver = gameState?.flags?.isGameOver;
  const currentTurn = gameState?.currentTurn || 0;

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* ── LEFT PANEL: PLAYER SHEET ── */}
      <div
        className={`w-80 bg-slate-900 border-r flex flex-col shadow-xl z-10 transition-colors duration-500 ${gameState?.isInCombat ? "border-rose-900" : "border-slate-800"}`}
      >
        <div className="p-5 border-b border-slate-800 relative overflow-hidden">
          {/* Subtle combat warning pulse */}
          {gameState?.isInCombat && (
            <div className="absolute inset-0 bg-rose-900/10 animate-pulse pointer-events-none" />
          )}

          <h2 className="text-2xl font-black tracking-wider text-amber-500 mb-1 uppercase relative z-10">
            {gameState?.player?.name || "Loading..."}
          </h2>
          <p className="text-sm font-semibold text-slate-400 relative z-10">
            Level {gameState?.player?.level} {gameState?.player?.characterClass}
          </p>
        </div>

        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6 hide-scrollbar">
          {gameState?.player && (
            <>
              {/* Vital Stats */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-950 rounded border border-slate-800 p-2 text-center">
                    <span className="block text-[10px] uppercase text-slate-500 font-bold">
                      HP
                    </span>
                    <span className="text-lg font-mono font-bold text-rose-400">
                      {gameState.player.hp}/{gameState.player.maxHp}
                    </span>
                  </div>
                  <div className="flex-1 bg-slate-950 rounded border border-slate-800 p-2 text-center">
                    <span className="block text-[10px] uppercase text-slate-500 font-bold">
                      AC
                    </span>
                    <span className="text-lg font-mono font-bold text-slate-300">
                      {gameState.player.ac}
                    </span>
                  </div>
                </div>
                {/* XP Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-indigo-400 font-bold">
                    <span>XP</span>
                    <span className="font-mono">
                      {gameState.player.xp} / {xpThreshold}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-300"
                      style={{
                        width: `${Math.max(0, (gameState.player.xp / xpThreshold) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Equipment Slots */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
                  Equipped Gear
                </h3>
                <div className="space-y-2">
                  <div className="bg-slate-950 border border-slate-800 rounded p-2 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Weapon
                      </span>
                      <span className="text-sm text-slate-300 font-bold">
                        {equippedWeapon?.name || "Unarmed"}
                      </span>
                    </div>
                    {equippedWeapon?.dice && (
                      <span className="text-xs font-mono text-rose-400">
                        {equippedWeapon.dice}
                      </span>
                    )}
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded p-2 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Armor
                      </span>
                      <span className="text-sm text-slate-300 font-bold">
                        {equippedArmor?.name || "Unarmored"}
                      </span>
                    </div>
                    {equippedArmor?.ac && (
                      <span className="text-xs font-mono text-cyan-400">
                        AC {equippedArmor.ac}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Skills / Abilities */}
              {playerSkills.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
                    Abilities
                  </h3>
                  <div className="space-y-2">
                    {playerSkills.map((skill) => {
                      const turnsSinceUse = currentTurn - skill.lastUsedTurn;
                      const isReady =
                        skill.lastUsedTurn === -1 ||
                        turnsSinceUse >= skill.cooldown;

                      return (
                        <div
                          key={skill.id}
                          className="bg-indigo-950/20 border border-indigo-900/30 rounded p-2 group relative"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-bold text-indigo-300">
                              {skill.name}
                            </span>
                            <span className="text-[10px] font-mono text-indigo-400/70">
                              {skill.dice && `${skill.dice} `}
                              {skill.mod && `+${skill.mod.substring(0, 3)}`}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight mb-2">
                            {skill.description}
                          </p>
                          <div className="flex gap-2">
                            <button
                              disabled={!isReady}
                              onClick={() =>
                                handleQuickAction(
                                  `I use my skill: ${skill.name} (ID: ${skill.id})`
                                )
                              }
                              className={`flex-1 text-[10px] py-1 rounded font-bold uppercase tracking-wider transition-all ${isReady ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-slate-800 text-slate-600 cursor-not-allowed"}`}
                            >
                              {isReady
                                ? "Use Skill"
                                : `Cooldown (${skill.cooldown - turnsSinceUse})`}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Inventory */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                    Backpack
                  </h3>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    🪙 {gameState.player.credits}
                  </span>
                </div>
                <ul className="space-y-2">
                  {gameState.player.itemIds.map((itemId) => {
                    const item = gameState.items[itemId];
                    if (!item) return null;
                    return (
                      <li
                        key={itemId}
                        className="text-xs bg-slate-800/50 px-2 py-2 rounded border border-slate-700 text-slate-300 flex items-center justify-between group hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold">{item.name}</span>
                          <span className="text-[9px] text-slate-500 uppercase">
                            {item.type} {item.value > 0 && `· ${item.value}c`}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.type === "weapon" || item.type === "armor" ? (
                            <button
                              onClick={() =>
                                handleQuickAction(
                                  `I equip my ${item.name} (ID: ${item.id})`
                                )
                              }
                              className="bg-slate-700 px-2 py-1 rounded text-white hover:bg-amber-600 text-[9px] uppercase font-bold"
                            >
                              Equip
                            </button>
                          ) : item.type === "consumable" ? (
                            <button
                              onClick={() =>
                                handleQuickAction(
                                  `I consume my ${item.name} (ID: ${item.id})`
                                )
                              }
                              className="bg-slate-700 px-2 py-1 rounded text-white hover:bg-emerald-600 text-[9px] uppercase font-bold"
                            >
                              Use
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── CENTER PANEL: CHAT / NARRATION ── */}
      {/* (This section is mostly untouched, keeping your awesome chat UI) */}
      <div className="flex-1 flex flex-col relative bg-slate-900 shadow-inner">
        {/* Connection Header */}
        <div className="absolute top-0 w-full p-4 flex items-start justify-between z-10 pointer-events-none">
          <div className="flex flex-col gap-2 pointer-events-auto">
            <span
              className={`text-xs px-3 py-1.5 rounded font-bold shadow-md ${connected ? "bg-emerald-900/90 border-emerald-700 text-emerald-400" : "bg-rose-900/90 border-rose-700 text-rose-400"} border`}
            >
              {connected ? "● LIVE" : "○ OFFLINE"}
            </span>
          </div>
          <button
            onClick={handleRestart}
            className="pointer-events-auto text-xs font-bold px-4 py-1.5 rounded bg-slate-800 hover:bg-rose-900 border border-slate-700 hover:border-rose-700 text-slate-400 hover:text-rose-300 transition-all shadow-md uppercase tracking-wider"
          >
            Restart
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-20 space-y-6 scroll-smooth">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-slate-500 italic">
              The Dungeon Master is waiting...
            </div>
          )}
          {messages.map((m: UIMessage) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-3xl px-6 py-4 rounded-2xl text-[15px] leading-relaxed shadow-lg ${isUser ? "bg-amber-600 text-white rounded-br-sm font-medium" : "bg-slate-800 border border-slate-700 text-slate-300 rounded-tl-sm"}`}
                >
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
              </div>
            );
          })}
          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="px-6 py-4 rounded-2xl bg-slate-800 border border-slate-700 text-slate-500 rounded-tl-sm animate-pulse flex gap-2 items-center">
                <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce delay-75" />
                <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce delay-150" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-3 max-w-4xl mx-auto"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isGameOver ? "You have perished." : "Describe your action..."
              }
              className="flex-1 bg-slate-900 text-slate-200 border border-slate-700 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-slate-600 text-lg shadow-inner"
              autoComplete="off"
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={stop}
                className="bg-rose-900 hover:bg-rose-800 border border-rose-700 text-rose-200 px-8 rounded-xl font-bold uppercase tracking-wider transition-colors shadow-lg"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-600 border border-transparent disabled:border-slate-700 text-white px-8 rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95"
              >
                Submit
              </button>
            )}
          </form>
        </div>
      </div>

      {/* ── RIGHT PANEL: INTERACTIVE ENVIRONMENT ── */}
      <div
        className={`w-80 bg-slate-900 border-l flex flex-col shadow-xl z-10 transition-colors duration-500 ${gameState?.isInCombat ? "border-rose-900" : "border-slate-800"}`}
      >
        {/* Dynamic Image Rendering (if your state has it!) */}
        {gameState?.sceneImageBase64 && (
          <div className="w-full h-40 bg-slate-950 border-b border-slate-800 relative">
            <img
              src={`data:image/jpeg;base64,${gameState.sceneImageBase64}`}
              alt="Scene"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
          </div>
        )}

        <div className="p-5 border-b border-slate-800 bg-slate-900/50">
          <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
            Current Location
          </h3>
          <div className="text-xl font-black text-slate-200 leading-tight mb-2">
            {currentRoom?.name || "The Void"}
          </div>
          {currentRoom?.description && (
            <p className="text-xs text-slate-400 italic mb-3 leading-relaxed border-l-2 border-slate-700 pl-2">
              "{currentRoom.description}"
            </p>
          )}
          {currentRoom?.isSafe ? (
            <span className="inline-block px-2 py-1 bg-emerald-950 border border-emerald-900 text-emerald-400 text-[10px] uppercase font-bold rounded">
              Safe Haven
            </span>
          ) : (
            <span className="inline-block px-2 py-1 bg-rose-950 border border-rose-900 text-rose-400 text-[10px] uppercase font-bold rounded">
              Hostile Zone
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 hide-scrollbar">
          {currentRoom ? (
            <>
              {/* COMBAT / ENEMIES */}
              {enemies.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-rose-500 font-bold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />{" "}
                    Threats
                  </h3>
                  <div className="space-y-3">
                    {enemies.map((enemy) => (
                      <div
                        key={enemy.id}
                        className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-rose-300 text-sm">
                            {enemy.name}
                          </h4>
                          <span className="text-[10px] font-mono font-bold bg-rose-900/80 text-rose-200 px-1.5 py-0.5 rounded">
                            AC {enemy.ac}
                          </span>
                        </div>
                        <p className="text-[10px] text-rose-400/60 mb-2 truncate">
                          {enemy.description}
                        </p>
                        <div className="flex justify-between text-xs mb-1 text-rose-400/80 font-mono">
                          <span>
                            HP {enemy.hp}/{enemy.maxHp}
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-3">
                          <div
                            className="bg-rose-500 h-full transition-all duration-300"
                            style={{
                              width: `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`
                            }}
                          />
                        </div>
                        <button
                          onClick={() =>
                            handleQuickAction(
                              `I attack ${enemy.name} (ID: ${enemy.id})`
                            )
                          }
                          className="w-full py-1.5 bg-rose-900/50 hover:bg-rose-700 border border-rose-800 rounded text-rose-200 text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          Attack
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NPCs / ACTORS */}
              {npcs.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-indigo-400 font-bold mb-3">
                    Present Entities
                  </h3>
                  <div className="space-y-2">
                    {npcs.map((npc) => (
                      <div
                        key={npc.id}
                        className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 group"
                      >
                        <div className="flex justify-between items-start mb-0.5">
                          <div className="font-bold text-slate-300 text-sm">
                            {npc.name}
                          </div>
                          <span className="text-[9px] uppercase text-slate-500">
                            {npc.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mb-2 leading-tight">
                          {npc.description}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleQuickAction(
                                `I talk to ${npc.name}. (ID: ${npc.id})`
                              )
                            }
                            className="flex-1 py-1.5 bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded text-slate-300 hover:text-white text-[10px] font-bold uppercase transition-all"
                          >
                            Talk
                          </button>
                          {npc.role === "trader" && (
                            <button
                              onClick={() =>
                                handleQuickAction(
                                  `I ask ${npc.name} to trade. (ID: ${npc.id})`
                                )
                              }
                              className="flex-1 py-1.5 bg-amber-950/30 hover:bg-amber-600 border border-amber-900/50 hover:border-amber-500 rounded text-amber-500 hover:text-white text-[10px] font-bold uppercase transition-all"
                            >
                              Trade
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* INTERACTABLES & LOOT */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">
                  Points of Interest
                </h3>
                {presentItems.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {presentItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-slate-950 border border-slate-800 p-2 rounded"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-300 font-bold">
                            {item.name}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {item.description}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleQuickAction(
                              `I interact with the ${item.name} (ID: ${item.id})`
                            )
                          }
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded text-slate-300 transition-colors uppercase font-bold ml-2 shrink-0"
                        >
                          {item.type === "prop" ? "Inspect" : "Take"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-600">
                    Nothing notable in sight.
                  </span>
                )}
              </div>

              {/* MAP CONNECTIONS */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">
                  Paths
                </h3>
                {connectedRooms.length > 0 ? (
                  <div className="space-y-2">
                    {connectedRooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() =>
                          handleQuickAction(
                            `I move to the ${room.name} (ID: ${room.id})`
                          )
                        }
                        className="w-full flex items-center justify-between text-left p-3 bg-slate-950 border border-slate-800 hover:border-slate-600 hover:bg-slate-800 rounded-lg transition-all group"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-300 group-hover:text-white">
                            {room.name}
                          </span>
                        </div>
                        <span className="text-slate-600 group-hover:text-white transform group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 italic border border-slate-800 p-3 rounded bg-slate-950/50">
                    You see no obvious exits.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-slate-600 text-sm font-mono animate-pulse text-center">
                Synchronizing...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-500 font-mono">
          Booting Engine...
        </div>
      }
    >
      <GameDashboard />
    </Suspense>
  );
}
