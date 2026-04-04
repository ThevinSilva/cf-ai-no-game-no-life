import { generateText, type LanguageModel } from "ai";
import type { Ability } from "../types/game";
import { encode } from "@toon-format/toon";

export interface SpecSheetConfig {
    setting: string;
    theme: string;
    level: number;
    playerStats: Record<Ability, number>;
    playerClass: string;
    gameModel: LanguageModel;
}

export default async function generateSpecSheet(config: SpecSheetConfig): Promise<string> {
    const { gameModel, setting, theme, level, playerStats, playerClass } = config;

    const prompt = `
Setting: ${setting} | Theme: ${theme} | Class: ${playerClass} | Level: ${level} | Stats: ${encode(playerStats)}

Generate a compact RPG spec sheet with these sections:

ITEMS (10): name, description, value(gp), dice, modifier, ac(if armour)
SKILLS (6): name, description, dice, modifier, cooldown(0=at-will, 2-5=powerful)
ACTORS (3-5): name, description, abilityMods, ac, maxHp, characterClass(Scavenger|Merchant|Brute), isHostile, role(trader|generic|enemy|ally), itemNames[], skillNames[]
ROOMS (5): name, description, isSafe, isBossRoom, order(1-5), itemNames[], hiddenItemNames[], actorNames[]

Rules:
- Room 3 must be safe (isSafe:true, traders/allies only)
- Room 5 must be boss room (isBossRoom:true, highest-HP hostile)
- Each actor/item appears in at most one room
- Only reference names defined above
- All names must be unique
  `.trim();

    try {
        const { text } = await generateText({
            model: gameModel,
            system: "You are a dungeon master. Generate a concise but flavourful RPG spec sheet. Be creative and consistent — names used in actors and rooms must match those defined in items and skills exactly.",
            prompt,
            stopWhen: ({ steps }) => steps.length >= 20,
        });

        return text;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate spec sheet: ${message}`);
    }
}
