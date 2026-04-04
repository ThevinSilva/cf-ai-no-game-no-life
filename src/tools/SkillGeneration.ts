import { type Skill } from "../types/game";
import { generateText, Output, type LanguageModel } from "ai";
import z from "zod";

export default async function generateSkills(specSheet: string, jsonGeneratorModel: LanguageModel): Promise<Skill[]> {
    try {
        const { output } = await generateText({
            model: jsonGeneratorModel,
            system: "You are a backend procedural generation engine. Generate RPG combat and utility skills strictly matching the requested structure. Do not omit any properties. Generate a minimum of 5 skills.",
            prompt: `Create any skills outlined in ${specSheet}. `,
            output: Output.object({
                schema: z.object({
                    skills: z.array(
                        z.object({
                            id: z.string().describe("A snake_case identifier, e.g., 'shadow_step' or 'cleaving_strike'"),
                            name: z.string().describe("Name of the skill"),
                            description: z.string().describe("Flavor text describing the visual and mechanical effect of the skill"),

                            // The mechanical hooks for the engine
                            dice: z.string().describe("Damage or healing dice, e.g., '2d6', '1d10'. Leave empty if it's pure utility."),
                            mod: z.string().describe("The primary stat modifier: 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', or 'charisma'"),

                            // Cooldown mechanics
                            cooldown: z.number().describe("Number of turns before this skill can be used again. Use 0 for at-will or basic abilities, 2-5 for powerful abilities."),
                            lastUsedTurn: z.number().describe("Always set this to -1 to indicate the skill has never been used."),
                        }),
                    ),
                }),
            }),
        });

        // Optional but recommended: Guarantee unique IDs just in case the AI hallucinates a duplicate
        const uniqueSkills = output.skills.map((skill) => ({
            ...skill,
            mod: skill.mod as any,
            id: `${skill.id}_${crypto.randomUUID()}`,
        }));

        return uniqueSkills;
    } catch (error) {
        console.error("Error generating skills:", {
            error,
        });
        throw new Error(`Failed to generate skills for: ${error instanceof Error ? error.message : String(error)}`);
    }
}
