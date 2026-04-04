import { type Room } from "../types/game";
import { generateText, Output, type LanguageModel } from "ai";
import z from "zod";

export default async function generateRooms(specSheet: string, jsonGeneratorModel: LanguageModel): Promise<Room[]> {
    try {
        const { output } = await generateText({
            model: jsonGeneratorModel,
            temperature: 0,
            system: "You are a backend procedural generation engine. Generate an interconnected set of RPG rooms strictly matching the requested structure. CRITICAL: Every field in the JSON schema is mandatory. Do not omit any properties.",
            prompt: `Create all skills outlined in ${specSheet}. `,

            output: Output.object({
                schema: z.object({
                    rooms: z.array(
                        z.object({
                            id: z.string().describe("A snake_case identifier, e.g., 'boss_chamber'"),
                            name: z.string().describe("Name of the room"),
                            description: z.string().describe("Rich flavor text describing atmosphere, lighting, and layout"),
                            isSafe: z.boolean().describe("True ONLY for the 1 designated safe room"),
                            isBossRoom: z.boolean().describe("True ONLY for the final boss room"),
                            order: z.number().describe("Room position 1-5 in traversal order"),
                            itemIds: z.array(z.string()).describe("IDs of items in plain sight"),
                            hiddenItemIds: z.array(z.string()).describe("IDs of hidden items requiring a search"),
                            actorIds: z.array(z.string()).describe("IDs of actors currently in this room"),
                        }),
                    ),
                }),
            }),
        });

        return output.rooms;
    } catch (error) {
        console.error("Error generating rooms:", {
            error,
        });
        throw new Error(`Failed to generate rooms for : ${error instanceof Error ? error.message : String(error)}`);
    }
}
