import { type Room, type Actor, type Item } from "../types/game";
import { generateText, Output, type LanguageModel } from "ai";
import z from "zod";

export default async function generateRooms(
  information: { setting: string; theme: string; level: number },
  availableContext: {
    actors: Actor[];
    items: Item[];
  },
  jsonGeneratorModel: LanguageModel
): Promise<Room[]> {
  try {
    // We pass the generated entities so the AI knows exactly who and what is in the dungeon
    const availableActorsText = JSON.stringify(
      availableContext.actors.map((a) => ({
        id: a.id,
        name: a.name,
        hp: a.hp,
        isHostile: a.isHostile
      })),
      null,
      2
    );
    const availableItemsText = JSON.stringify(
      availableContext.items.map((i) => ({
        id: i.id,
        name: i.name,
        type: i.type
      })),
      null,
      2
    );

    const { output } = await generateText({
      model: jsonGeneratorModel,
      system:
        "You are a backend procedural generation engine. Generate an interconnected set of RPG rooms strictly matching the requested structure.",
      prompt: `The player is exploring a Level ${information.level} area: "${information.setting}" with a "${information.theme}" theme. 
          Generate exactly 5 distinct rooms that make up this area.
          
          CRITICAL RULES:
          1. Iny the middle ONE room MUST be a "Safe Room" (isSafe: true) where the player can rest. Traders or Allies should be placed here.
          2. the LAST room MUST be a "Boss Room". Find the most powerful Hostile Actor from the list below (highest HP/stats) and place their ID in this room's actorIds.
          3. Distribute the remaining actors and items logically across the 5 rooms. 
          4. Place obvious loot in itemIds, and hidden loot/traps in hiddenItemIds.
          5. ONLY use the exact Actor IDs and Item IDs provided below. If an item or actor is already assigned, do not put them in multiple rooms.

          Available Actors (Place them in actorIds):
          ${availableActorsText}

          Available Items (Place them in itemIds or hiddenItemIds):
          ${availableItemsText}`,

      output: Output.object({
        schema: z.object({
          rooms: z
            .array(
              z.object({
                id: z
                  .string()
                  .describe(
                    "A snake_case identifier, e.g., 'boss_chamber' or 'ruined_hallway'"
                  ),
                name: z.string().describe("The display name of the room"),
                description: z
                  .string()
                  .describe(
                    "Rich flavor text describing the room's atmosphere, lighting, and layout."
                  ),
                isSafe: z
                  .boolean()
                  .describe(
                    "True ONLY for the 1 designated safe room. False for all others."
                  ),

                // Arrays for the AI to map the IDs into
                itemIds: z
                  .array(z.string())
                  .describe("IDs of items sitting in plain sight"),
                hiddenItemIds: z
                  .array(z.string())
                  .describe(
                    "IDs of items hidden from view, requiring a search check"
                  ),
                actorIds: z
                  .array(z.string())
                  .describe("IDs of the actors currently in this room")
              })
            )
            .length(5) // Zod enforcement to guarantee exactly 5 rooms!
        })
      })
    });

    // Append unique UUIDs to the generated Room IDs to prevent global state collisions
    // NOTE: If you generate the 'roomNodes' adjacency list later, make sure you use these updated IDs!
    return output.rooms.map((room) => ({
      ...room,
      id: `${room.id}_${crypto.randomUUID()}`
    }));
  } catch (error) {
    console.error("Error generating rooms:", {
      error,
      information,
      availableContextCount: {
        actors: availableContext.actors.length,
        items: availableContext.items.length
      }
    });
    throw new Error(`Failed to generate rooms for ${information.setting} (level ${information.level}): ${error instanceof Error ? error.message : String(error)}`);
  }
}
