import { type Actor, type Item, type Skill } from "../types/game";
import { generateText, Output, type LanguageModel } from "ai";
import { encode } from "@toon-format/toon";
import z from "zod";

export default async function generateActors(
    information: { setting: string; theme: string; level: number },
    availableContext: {
        items: Item[];
        skills: Skill[];
    },
    jsonGeneratorModel: LanguageModel,
): Promise<Actor[]> {
    try {
        const strippedItems = availableContext.items.map((item) => ({
            id: item.id,
            name: item.name,
            mod: item.mod,
            ac: item.ac,
            desciption: item.description,
        }));

        const strippedSkills = availableContext.skills.map((skill) => ({
            id: skill.id,
            name: skill.name,
            mod: skill.mod,
            description: skill.description,
        }));

        const availableItemsEncoded = encode(strippedItems);
        const availableSkillsEncoded = encode(strippedSkills);

        const { output } = await generateText({
            model: jsonGeneratorModel,
            system: "You are a backend procedural generation engine. Generate RPG actors (NPCs, enemies, traders) strictly matching the requested structure. CRITICAL: Every field in the JSON schema is mandatory. Do not omit any properties.",
            prompt: `The player is exploring a Level ${information.level} area: "${information.setting}" with a "${information.theme}" theme. Generate 3 to 5 actors (a mix of hostile enemies, neutral traders, or generic NPCs). Equip them with items and skills from the available lists below. Available Items: ${availableItemsEncoded} Available Skills: ${availableSkillsEncoded}
        `,
            output: Output.object({
                schema: z.object({
                    actors: z.array(
                        z.object({
                            id: z.string().describe("A snake_case identifier, e.g., 'goblin_ambusher'"),
                            name: z.string().describe("Name of the actor"),
                            characterClass: z.string().describe("Class or archetype, e.g., 'Scavenger', 'Merchant', 'Brute'"),
                            hp: z.number().describe("Current Hit Points, scaled to the level"),
                            maxHp: z.number().describe("Maximum Hit Points"),
                            ac: z.number().describe("Armor Class (e.g., 10-18)"),
                            mods: z
                                .object({
                                    strength: z.number(),
                                    dexterity: z.number(),
                                    constitution: z.number(),
                                    intelligence: z.number(),
                                    wisdom: z.number(),
                                    charisma: z.number(),
                                })
                                .describe("Stat modifiers, usually between -2 and +4"),
                            description: z.string().describe("Visual and behavioral description of the actor"),
                            isHostile: z.boolean().describe("True if they will attack the player on sight"),
                            role: z.string().describe("The actor's role: 'trader', 'generic', 'enemy', or 'ally'"),
                            itemIds: z.array(z.string()).describe("Array of valid item IDs this actor possesses as gear or loot"),
                            skillIds: z.array(z.string()).describe("Array of valid skill IDs this actor can use in combat"),
                        }),
                    ),
                }),
            }),
        });

        // Append unique UUIDs to the generated Actor IDs to prevent global state collisions
        return output.actors.map((actor) => ({
            ...actor,
            role: actor.role as any, // Cast to match Role type after simplifying Zod schema
            id: `${actor.id}_${crypto.randomUUID()}`,
            coreMemories: [],
        }));
    } catch (error) {
        console.error("Error generating actors:", {
            error,
            information,
            availableContextCount: {
                items: availableContext.items.length,
                skills: availableContext.skills.length,
            },
        });
        throw new Error(`Failed to generate actors for ${information.setting} (level ${information.level}): ${error instanceof Error ? error.message : String(error)}`);
    }
}
