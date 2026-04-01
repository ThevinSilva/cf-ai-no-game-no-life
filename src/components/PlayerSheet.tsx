import type { GameState, Skill } from "../types/game";

interface PlayerSheetProps {
    gameState: GameState;
    handleQuickAction: (action: string) => void;
}

export default function PlayerSheet({ gameState, handleQuickAction }: PlayerSheetProps) {
    const { player, items, skills, currentTurn } = gameState;
    const xpThreshold = (player.level || 1) * 100;

    const equippedWeapon = player.equippedWeaponId ? items[player.equippedWeaponId] : null;
    const equippedArmor = player.equippedArmorId ? items[player.equippedArmorId] : null;

    const playerSkills = player.skillIds.map((id) => skills[id]).filter(Boolean) as Skill[];

    return (
        <aside className="side-panel hide-scrollbar">
            <div className="header">
                <h2 style={{ color: "var(--accent-color)", margin: 0, textTransform: "uppercase" }}>{player.name}</h2>
                <div style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "bold" }}>
                    Level {player.level} {player.characterClass}
                </div>
            </div>

            <div className="section">
                <div className="stat-grid">
                    <div className="stat-box">
                        <span className="stat-label">HP</span>
                        <span className="stat-value" style={{ color: "var(--danger-color)" }}>
                            {player.hp}/{player.maxHp}
                        </span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">AC</span>
                        <span className="stat-value">{player.ac}</span>
                    </div>
                </div>

                <div className="xp-container">
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--info-color)", fontWeight: "bold" }}>
                        <span>XP</span>
                        <span>
                            {player.xp} / {xpThreshold}
                        </span>
                    </div>
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${Math.max(0, (player.xp / xpThreshold) * 100)}%` }} />
                    </div>
                </div>
            </div>

            <div className="section">
                <h3 className="stat-label" style={{ marginBottom: "10px" }}>
                    Equipped Gear
                </h3>
                <div className="item-card">
                    <div>
                        <div className="stat-label">Weapon</div>
                        <div style={{ fontWeight: "bold" }}>{equippedWeapon?.name || "Unarmed"}</div>
                    </div>
                    {equippedWeapon?.dice && <span style={{ color: "var(--danger-color)", fontFamily: "var(--font-mono)" }}>{equippedWeapon.dice}</span>}
                </div>
                <div className="item-card">
                    <div>
                        <div className="stat-label">Armor</div>
                        <div style={{ fontWeight: "bold" }}>{equippedArmor?.name || "Unarmored"}</div>
                    </div>
                    {equippedArmor?.ac && <span style={{ color: "var(--success-color)", fontFamily: "var(--font-mono)" }}>AC {equippedArmor.ac}</span>}
                </div>
            </div>

            {playerSkills.length > 0 && (
                <div className="section">
                    <h3 className="stat-label" style={{ marginBottom: "10px" }}>
                        Abilities
                    </h3>
                    {playerSkills.map((skill) => {
                        const turnsSinceUse = currentTurn - skill.lastUsedTurn;
                        const isReady = skill.lastUsedTurn === -1 || turnsSinceUse >= skill.cooldown;

                        return (
                            <div key={skill.id} className="item-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: "5px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                                    <span style={{ fontWeight: "bold", color: "var(--info-color)" }}>{skill.name}</span>
                                    <span className="stat-label">{skill.dice && `${skill.dice} `}</span>
                                </div>
                                <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>{skill.description}</p>
                                <button disabled={!isReady} onClick={() => handleQuickAction(`I use my skill: ${skill.name} (ID: ${skill.id})`)} className="btn-primary" style={{ width: "100%", fontSize: "10px", padding: "5px" }}>
                                    {isReady ? "Use Skill" : `Cooldown (${skill.cooldown - turnsSinceUse})`}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="section" style={{ borderBottom: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h3 className="stat-label">Backpack</h3>
                    <span style={{ color: "var(--accent-color)", fontWeight: "bold" }}>🪙 {player.credits}</span>
                </div>
                {player.itemIds.map((itemId) => {
                    const item = items[itemId];
                    if (!item) return null;
                    return (
                        <div key={itemId} className="item-card">
                            <div>
                                <div style={{ fontWeight: "bold", fontSize: "13px" }}>{item.name}</div>
                                <div className="stat-label" style={{ fontSize: "9px" }}>
                                    {item.type} {item.value > 0 && `· ${item.value}c`}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "5px" }}>
                                {item.type === "weapon" || item.type === "armor" ? (
                                    <button onClick={() => handleQuickAction(`I equip my ${item.name} (ID: ${item.id})`)} className="btn-outline" style={{ fontSize: "9px", padding: "4px 8px" }}>
                                        Equip
                                    </button>
                                ) : item.type === "consumable" ? (
                                    <button onClick={() => handleQuickAction(`I consume my ${item.name} (ID: ${item.id})`)} className="btn-outline" style={{ fontSize: "9px", padding: "4px 8px" }}>
                                        Use
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
