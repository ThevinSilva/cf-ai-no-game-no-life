import { type Item } from "../types/game";
import { generateText, Output, type LanguageModel } from "ai";
import z from "zod";

export default async function generateItems(specSheet: string, jsonGeneratorModel: LanguageModel): Promise<Item[]> {
    try {
        const { output } = await generateText({
            model: jsonGeneratorModel,
            temperature: 0,
            system: "You are a backend procedural generation engine that extracts relevant data from the provided specsheet then creates RPG item data strictly matching the requested structure.",
            prompt: `Create any items outlined in ${specSheet}. Take some creative liberty when certain details aren't specified.`,
            output: Output.object({
                schema: z.object({
                    items: z.array(
                        z.object({
                            id: z.string().describe("A snake_case identifier, e.g., 'rusty_iron_key'"),
                            name: z.string().describe("Name of the item"),
                            description: z.string().describe("Flavor text describing the item's appearance and vibe"),
                            value: z.number().describe("Value in credits/gold"),
                            type: z.string().describe("'weapon', 'armor', 'consumable', 'misc', or 'prop'"),
                            dice: z.string().describe("E.g., '1d8' for weapons, '2d4+2' for healing"),
                            mod: z.string().describe("One of: 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'"),
                            ac: z.number().describe("Base armor class or AC bonus"),
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
