import { useState } from "react";
import type { Ability } from "../types/game";

interface SetupScreenProps {
    onStart: (config: { name: string; characterClass: string; setting: string; theme: string; stats: Record<Ability, number> }) => void;
}

const ABILITIES: Ability[] = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const INITIAL_POINTS = 20;

export default function SetupScreen({ onStart }: SetupScreenProps) {
    const [name, setName] = useState("Timmy");
    const [characterClass, setCharacterClass] = useState("Technomancer");
    const [setting, setSetting] = useState("dungeon");
    const [theme, setTheme] = useState("dark fantasy");

    const [stats, setStats] = useState<Record<Ability, number>>({
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
    });

    const pointsUsed = Object.values(stats).reduce((acc, val) => acc + (val - 10), 0);
    const pointsRemaining = INITIAL_POINTS - pointsUsed;

    const handleStatChange = (ability: Ability, delta: number) => {
        const newVal = stats[ability] + delta;
        if (newVal < 8 || newVal > 18) return;
        if (delta > 0 && pointsRemaining <= 0) return;

        setStats({
            ...stats,
            [ability]: newVal,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pointsRemaining < 0) {
            alert("You have used too many points!");
            return;
        }

        // Convert base stats (8-18) to modifiers (-1 to +4)
        const mods = Object.fromEntries(Object.entries(stats).map(([ability, value]) => [ability, Math.floor((value - 10) / 2)])) as Record<Ability, number>;

        onStart({ name, characterClass, setting, theme, stats: mods });
    };

    return (
        <div className="setup-screen" style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>
            <h1 style={{ color: "var(--accent-color)", marginBottom: "10px", textAlign: "center" }}>Initialize Identity</h1>
            <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: "30px" }}>Forge your presence in the digital void.</p>

            <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
                <div className="setup-column">
                    <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>Core Data</h3>
                    <div className="form-group">
                        <label>Designation (Name)</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Archetype (Class)</label>
                        <input type="text" value={characterClass} onChange={(e) => setCharacterClass(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>World Setting</label>
                        <input type="text" value={setting} onChange={(e) => setSetting(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Atmospheric Theme</label>
                        <textarea value={theme} onChange={(e) => setTheme(e.target.value)} rows={3} required />
                    </div>
                </div>

                <div className="setup-column">
                    <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                        <span>Neural Mapping</span>
                        <span style={{ color: pointsRemaining < 0 ? "#ff4444" : "var(--accent-color)" }}>{pointsRemaining} pts</span>
                    </h3>
                    <div className="stats-allocation" style={{ marginTop: "20px" }}>
                        {ABILITIES.map((ability) => (
                            <div key={ability} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "15px", background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "4px" }}>
                                <label style={{ textTransform: "capitalize", flex: 1 }}>{ability}</label>
                                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                    <button type="button" onClick={() => handleStatChange(ability, -1)} className="btn-stat" disabled={stats[ability] <= 8}>
                                        -
                                    </button>
                                    <span style={{ minWidth: "25px", textAlign: "center", fontWeight: "bold", color: "var(--accent-color)" }}>{stats[ability]}</span>
                                    <button type="button" onClick={() => handleStatChange(ability, 1)} className="btn-stat" disabled={stats[ability] >= 18 || pointsRemaining <= 0}>
                                        +
                                    </button>
                                    <span style={{ fontSize: "0.8em", color: "var(--text-secondary)", minWidth: "30px" }}>
                                        ({Math.floor((stats[ability] - 10) / 2) >= 0 ? "+" : ""}
                                        {Math.floor((stats[ability] - 10) / 2)})
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: "0.85em", color: "var(--text-secondary)", fontStyle: "italic" }}>Modifiers are calculated as (Stat - 10) / 2. Use points to enhance your capabilities.</p>
                </div>

                <button type="submit" className="btn-primary" style={{ gridColumn: "1 / -1", marginTop: "10px", padding: "15px", fontSize: "1.1em" }}>
                    Commit Configuration & Start Run
                </button>
            </form>
        </div>
    );
}
