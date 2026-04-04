import { type Actor } from "../types/game";
import { generateText, Output, type LanguageModel } from "ai";
import z from "zod";

export default async function generateActors(specSheet: string, jsonGeneratorModel: LanguageModel): Promise<Actor[]> {
    try {
        const { output } = await generateText({
            model: jsonGeneratorModel,
            system: "You are a backend procedural generation engine. Extract RPG actors (NPCs, enemies, traders) strictly matching the requested structure.",
            prompt: `Create all actors outlined in ${specSheet}. Equip them with items and skills from the available lists below.`,
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

        return output.actors.map((actor) => ({
            ...actor,
            role: actor.role as any,
            coreMemories: [],
        }));
    } catch (error) {
        console.error("Error generating actors:", {
            error,
        });
        throw new Error(`Failed to generate actors for: ${error instanceof Error ? error.message : String(error)}`);
    }
}
