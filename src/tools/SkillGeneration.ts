import { type Skill } from "../types/game";
import { generateText, Output, type LanguageModel } from "ai";
import z from "zod";

export default async function generateSkills(
  information: { characterClass: string; theme: string; level: number },
  jsonGeneratorModel: LanguageModel
): Promise<Skill[]> {
  try {
    const { output } = await generateText({
      model: jsonGeneratorModel,
      system:
        "You are a backend procedural generation engine. Generate RPG combat and utility skills strictly matching the requested structure.",
      prompt: `The player is a Level ${information.level} ${information.characterClass} focusing on a "${information.theme}" theme. Generate a balanced mix of offensive, defensive, and utility skills appropriate for this level and class.`,
      output: Output.object({
        schema: z.object({
          skills: z
            .array(
              z.object({
                id: z
                  .string()
                  .describe(
                    "A snake_case identifier, e.g., 'shadow_step' or 'cleaving_strike'"
                  ),
                name: z.string().describe("Name of the skill"),
                description: z
                  .string()
                  .describe(
                    "Flavor text describing the visual and mechanical effect of the skill"
                  ),

                // The mechanical hooks for the engine
                dice: z
                  .string()
                  .optional()
                  .describe(
                    "Damage or healing dice, e.g., '2d6', '1d10'. Leave undefined if it's pure utility."
                  ),
                mod: z
                  .enum([
                    "strength",
                    "dexterity",
                    "constitution",
                    "intelligence",
                    "wisdom",
                    "charisma"
                  ])
                  .optional()
                  .describe("The primary stat modifier used for this skill"),

                // Cooldown mechanics
                cooldown: z
                  .number()
                  .describe(
                    "Number of turns before this skill can be used again. Use 0 for at-will or basic abilities, 2-5 for powerful abilities."
                  ),
                lastUsedTurn: z
                  .number()
                  .describe(
                    "Always set this to -1 to indicate the skill has never been used."
                  )
                  .default(-1)
              })
            )
            .min(3)
            .max(6)
        })
      })
    });

    // Optional but recommended: Guarantee unique IDs just in case the AI hallucinates a duplicate
    const uniqueSkills = output.skills.map((skill) => ({
      ...skill,
      id: `${skill.id}_${crypto.randomUUID()}`
    }));

    return uniqueSkills;
  } catch (error) {
    console.error("Error generating skills:", {
      error,
      information
    });
    throw new Error(`Failed to generate skills for class ${information.characterClass} (level ${information.level}, theme ${information.theme}): ${error instanceof Error ? error.message : String(error)}`);
  }
}
