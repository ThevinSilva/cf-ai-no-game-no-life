import { type Item } from "../types/game";
import { generateText, Output, type LanguageModel } from "ai";
import z from "zod";

export default async function generateItems(setting: string, theme: string, jsonGeneratorModel: LanguageModel): Promise<Item[]> {
    try {
        const { output } = await generateText({
            model: jsonGeneratorModel,
            system: "You are a backend procedural generation engine. Generate RPG item data strictly matching the requested structure.",
            prompt: `The player searches an area with this "${theme}" theme. Generate weapons, armor, consumables, and miscellaneous as well as props and potential lootable rewards and items that can be used to populate "${setting}".`,
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

        console.log(output);

        return output.items.map((item) => ({
            ...item,
            type: item.type as any,
            mod: item.mod as any,
            id: `${item.id}_${crypto.randomUUID()}`,
        }));
    } catch (error) {
        console.error("Error generating items:", {
            error,
            setting,
            theme,
        });
        throw new Error(`Failed to generate items for ${setting} (${theme}): ${error instanceof Error ? error.message : String(error)}`);
    }
}
