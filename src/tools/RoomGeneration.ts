import { type Room, type Actor, type Item } from "../types/game";
import { generateText, Output, type LanguageModel } from "ai";
import z from "zod";

export default async function generateRooms(
    information: { setting: string; theme: string; level: number },
    availableContext: {
        actors: Actor[];
        items: Item[];
    },
    jsonGeneratorModel: LanguageModel,
): Promise<Room[]> {
    try {
        const availableActorsText = JSON.stringify(
            availableContext.actors.map((a) => ({
                id: a.id,
                name: a.name,
                hp: a.hp,
                isHostile: a.isHostile,
                desciption: a.description,
            })),
            null,
            2,
        );
        const availableItemsText = JSON.stringify(
            availableContext.items
                .filter((i) => i.type == "prop" || i.type == "misc") // Only include non-weapon/armor items to avoid confusion in room generation
                .map((i) => ({
                    id: i.id,
                    name: i.name,
                    type: i.type,
                    desciption: i.description,
                })),
            null,
            2,
        );

        const { output } = await generateText({
            model: jsonGeneratorModel,
            system: "You are a backend procedural generation engine. Generate an interconnected set of RPG rooms strictly matching the requested structure. CRITICAL: Every field in the JSON schema is mandatory. Do not omit any properties.",
            prompt: `The player is exploring a Level ${information.level} area: "${information.setting}" with a "${information.theme}" theme.
              Generate exactly 5 distinct rooms (order 1 through 5).

              RULES:
              1. Room at order 3 (the middle) MUST be a Safe Room (isSafe: true, isBossRoom: false). Place traders or allies here.
              2. Room at order 5 (the last) MUST be the Boss Room (isBossRoom: true, isSafe: false). Place the highest-HP hostile actor here.
              3. All other rooms: isSafe: false, isBossRoom: false.
              4. Distribute remaining actors and items logically. Each actor/item ID should appear in AT MOST ONE room.
              5. Place visible loot in itemIds, hidden loot or traps in hiddenItemIds.
              6. ONLY use the exact IDs listed below — do not invent new ones.

              Available Actors:
              ${availableActorsText}

              Available Items:
              ${availableItemsText}`,

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

        // Append unique UUIDs to the generated Room IDs to prevent global state collisions
        // NOTE: If you generate the 'roomNodes' adjacency list later, make sure you use these updated IDs!

        return output.rooms.map((room) => ({
            ...room,
            id: `${room.id}_${crypto.randomUUID()}`,
        }));
    } catch (error) {
        console.error("Error generating rooms:", {
            error,
            information,
            availableContextCount: {
                actors: availableContext.actors.length,
                items: availableContext.items.length,
            },
        });
        throw new Error(`Failed to generate rooms for ${information.setting} (level ${information.level}): ${error instanceof Error ? error.message : String(error)}`);
    }
}
