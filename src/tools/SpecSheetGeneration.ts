import { generateText } from "ai";
import type { GenerationConfig } from "../types/game";
import { encode } from "@toon-format/toon";

export default async function generateSpecSheet(config: GenerationConfig): Promise<string> {
    const { jsonGeneratorModel, setting, theme, level, stats, characterClass } = config;

    const prompt = `
	Setting: ${setting} | Theme: ${theme} | Class: ${characterClass} | Level: ${level} | Stats: ${encode(stats)}
	Generate a compact RPG spec sheet. Be creative — references, humour, and themed names encouraged.
	Generate in order: items first, then skills, then actors and rooms referencing those exact names.

	ITEMS (10): id(item_*), name, description, value(gp), dice, modifier, ac(if armour)
	SKILLS (6): id(skill_*), name, description, dice, modifier, cooldown(0=at-will, 2-5=powerful), lastUsedTurn(by default -1)
	ACTORS (3-5): id(actor_*), name, description, abilityMods, ac, maxHp, characterClass(Scavenger|Merchant|Brute), isHostile, role(trader|generic|enemy|ally), itemIds[], skillIds[]
	ROOMS (5): id(room_*), name, description, isSafe, isBossRoom, order(1-5), itemIds[], hiddenItemIds[], actorIds[] — build a loose narrative arc from room 1 to 5

	Rules:
	- Type for item should be one of 'weapon', 'armor', 'consumable', 'misc', or 'prop'.
	- Room 3 must be safe (isSafe:true, traders/allies only)
	- Room 5 must be boss room (isBossRoom:true, highest-HP hostile)
	- Each actor/item appears in at most one room
	- Only reference ids defined above
	- All ids and names must be unique
	- Uses the industry-standard "NdX" notation (e.g., 2d6, 1d20...) THATS IT
	- Mod is the specific attribute of the character that the item or skill should check (e.g., "Strength")
	`.trim();

    try {
        const { text } = await generateText({
            model: jsonGeneratorModel,
            system: "You are a dungeon master. Generate a concise but flavourful RPG spec sheet. Be creative and consistent — names used in actors and rooms must match those defined in items and skills exactly.",
            prompt,
            maxOutputTokens: 4096,
        });

        console.log(text);

        return text;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate spec sheet: ${message}`);
    }
}
