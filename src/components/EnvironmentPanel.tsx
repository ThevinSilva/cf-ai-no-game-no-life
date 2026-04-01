import type { GameState, Room, Actor, Item } from "../types/game";

interface EnvironmentPanelProps {
    gameState: GameState;
    handleQuickAction: (action: string) => void;
}

export default function EnvironmentPanel({ gameState, handleQuickAction }: EnvironmentPanelProps) {
    const currentRoomId = gameState.currentRoomId;
    const currentRoom = currentRoomId ? gameState.rooms[currentRoomId] : null;

    const connectedRoomIds = currentRoomId ? gameState.roomNodes[currentRoomId] || [] : [];
    const connectedRooms = connectedRoomIds.map((id) => gameState.rooms[id]).filter(Boolean) as Room[];

    const presentActors = (currentRoom?.actorIds.map((id) => gameState.actors[id]).filter(Boolean) as Actor[]) || [];

    const enemies = presentActors.filter((a) => a.isHostile);
    const npcs = presentActors.filter((a) => !a.isHostile);

    const presentItems = (currentRoom?.itemIds.map((id) => gameState.items[id]).filter(Boolean) as Item[]) || [];

    return (
        <aside className="side-panel side-panel-right hide-scrollbar">
            {gameState.sceneImageBase64 && (
                <div style={{ width: "100%", height: "200px", overflow: "hidden", borderBottom: "1px solid var(--border-color)" }}>
                    <img src={`data:image/jpeg;base64,${gameState.sceneImageBase64}`} alt="Scene" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
                </div>
            )}

            <div className="header">
                <span className="stat-label">Location</span>
                <h2 style={{ margin: "5px 0", fontSize: "20px" }}>{currentRoom?.name || "The Void"}</h2>
                {currentRoom?.description && <p style={{ fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic", margin: "10px 0" }}>"{currentRoom.description}"</p>}
                <div
                    style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        borderRadius: "4px",
                        backgroundColor: currentRoom?.isSafe ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: currentRoom?.isSafe ? "var(--success-color)" : "var(--danger-color)",
                        border: `1px solid ${currentRoom?.isSafe ? "var(--success-color)" : "var(--danger-color)"}`,
                    }}
                >
                    {currentRoom?.isSafe ? "SAFE ZONE" : "HOSTILE ZONE"}
                </div>
            </div>

            <div className="section">
                {enemies.length > 0 && (
                    <div style={{ marginBottom: "20px" }}>
                        <h3 className="stat-label" style={{ color: "var(--danger-color)", marginBottom: "10px" }}>
                            Threats
                        </h3>
                        {enemies.map((enemy) => (
                            <div key={enemy.id} className="item-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                                    <span style={{ fontWeight: "bold", color: "var(--danger-color)" }}>{enemy.name}</span>
                                    <span className="stat-label">AC {enemy.ac}</span>
                                </div>
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill" style={{ backgroundColor: "var(--danger-color)", width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
                                </div>
                                <button onClick={() => handleQuickAction(`I attack ${enemy.name} (ID: ${enemy.id})`)} className="btn-danger" style={{ width: "100%", fontSize: "11px", padding: "6px" }}>
                                    Attack
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {npcs.length > 0 && (
                    <div style={{ marginBottom: "20px" }}>
                        <h3 className="stat-label" style={{ color: "var(--info-color)", marginBottom: "10px" }}>
                            Entities
                        </h3>
                        {npcs.map((npc) => (
                            <div key={npc.id} className="item-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: "5px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                                    <span style={{ fontWeight: "bold" }}>{npc.name}</span>
                                    <span className="stat-label">{npc.role}</span>
                                </div>
                                <div style={{ display: "flex", gap: "5px", width: "100%" }}>
                                    <button onClick={() => handleQuickAction(`I talk to ${npc.name}. (ID: ${npc.id})`)} className="btn-outline" style={{ flex: 1, fontSize: "10px" }}>
                                        Talk
                                    </button>
                                    {npc.role === "trader" && (
                                        <button onClick={() => handleQuickAction(`I ask ${npc.name} to trade. (ID: ${npc.id})`)} className="btn-primary" style={{ flex: 1, fontSize: "10px" }}>
                                            Trade
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ marginBottom: "20px" }}>
                    <h3 className="stat-label" style={{ marginBottom: "10px" }}>
                        Loot & Objects
                    </h3>
                    {presentItems.length > 0 ? (
                        presentItems.map((item) => (
                            <div key={item.id} className="item-card">
                                <span style={{ fontSize: "13px", fontWeight: "bold" }}>{item.name}</span>
                                <button onClick={() => handleQuickAction(`I interact with the ${item.name} (ID: ${item.id})`)} className="btn-outline" style={{ fontSize: "10px", padding: "4px 8px" }}>
                                    {item.type === "prop" ? "Inspect" : "Take"}
                                </button>
                            </div>
                        ))
                    ) : (
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic" }}>Nothing of interest.</div>
                    )}
                </div>

                <div>
                    <h3 className="stat-label" style={{ marginBottom: "10px" }}>
                        Exits
                    </h3>
                    {connectedRooms.length > 0 ? (
                        connectedRooms.map((room) => (
                            <button key={room.id} onClick={() => handleQuickAction(`I move to the ${room.name} (ID: ${room.id})`)} className="btn-outline" style={{ width: "100%", textAlign: "left", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span>{room.name}</span>
                                <span>→</span>
                            </button>
                        ))
                    ) : (
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic" }}>No obvious exits.</div>
                    )}
                </div>
            </div>
        </aside>
    );
}
