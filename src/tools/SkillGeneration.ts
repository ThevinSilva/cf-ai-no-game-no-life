import { type Skill } from "../types/game";
import { generateText, Output, type LanguageModel } from "ai";
import z from "zod";

export default async function generateSkills(specSheet: string, jsonGeneratorModel: LanguageModel): Promise<Skill[]> {
    try {
        const { output } = await generateText({
            model: jsonGeneratorModel,
            temperature: 0,
            system: "You are a backend procedural generation engine. Extract RPG combat and utility skills strictly matching the requested structure. Do not omit any properties. Generate a minimum of 5 skills.",
            prompt: `Create any skills outlined in ${specSheet}. `,
            output: Output.object({
                schema: z.object({
                    skills: z.array(
                        z.object({
                            id: z.string(),
                            name: z.string(),
                            description: z.string(),
                            // The mechanical hooks for the engine
                            dice: z.string(),
                            mod: z.string(),
                            // Cooldown mechanics
                            cooldown: z.number(),
                            lastUsedTurn: z.number(),
                        }),
                    ),
                }),
            }),
        });

        // Optional but recommended: Guarantee unique IDs just in case the AI hallucinates a duplicate
        const uniqueSkills = output.skills.map((skill) => ({
            ...skill,
            mod: skill.mod as any,
        }));

        return uniqueSkills;
    } catch (error) {
        console.error("Error generating skills:", {
            error,
        });
        throw new Error(`Failed to generate skills for: ${error instanceof Error ? error.message : String(error)}`);
    }
}
