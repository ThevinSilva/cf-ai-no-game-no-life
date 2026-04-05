import { type Item } from "../types/game";
import { generateText, Output, type LanguageModel } from "ai";
import z from "zod";

export default async function generateItems(specSheet: string, jsonGeneratorModel: LanguageModel): Promise<Item[]> {
    try {
        const { output } = await generateText({
            model: jsonGeneratorModel,
            temperature: 0,
            system: "You are a backend procedural generation engine that extracts relevant data from the provided Soec Sheet matching the requested structure.",
            prompt: `Create any items outlined in ${specSheet}. Take some creative liberty when certain details aren't specified.`,
            output: Output.object({
                schema: z.object({
                    items: z.array(
                        z.object({
                            id: z.string(),
                            name: z.string(),
                            description: z.string(),
                            value: z.number(),
                            type: z.string(),
                            dice: z.string(),
                            mod: z.string(),
                            ac: z.number(),
                        }),
                    ),
                }),
            }),
        });

        return output.items.map((item) => ({
            ...item,
            type: item.type as any,
            mod: item.mod as any,
        }));
    } catch (error) {
        console.error("Error generating items:", {
            error,
        });
        throw new Error(`Failed to generate items for: ${error instanceof Error ? error.message : String(error)}`);
    }
}
