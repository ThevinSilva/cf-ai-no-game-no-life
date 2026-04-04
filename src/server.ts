import { createWorkersAI } from "workers-ai-provider";
import { routeAgentRequest, callable, type Schedule } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { streamText, convertToModelMessages, pruneMessages, tool } from "ai";
import { z } from "zod";
import type { GameState, Ability } from "./types/game";
import initializeGameState from "./actions/InitializeGameState"; // The pipeline we just built!
import { moveAction } from "./actions/move";
import { interactAction } from "./actions/interact";
import { consumeAction } from "./actions/consume";
import { attackAction } from "./actions/attack";
import { talkAction } from "./actions/talk";
import { encode } from "@toon-format/toon";
import timer from "./utils/timer";

export class ChatAgent extends AIChatAgent<Env, GameState> {
    theme = "";
    setting = "";
    waitForMcpConnections = true;

    aiProvider = createWorkersAI({ binding: this.env.AI });
    // jsonGeneratorModel = this.aiProvider("@cf/openai/gpt-oss-120b");
    // jsonGeneratorModel = this.aiProvider("@cf/mistralai/mistral-small-3.1-24b-instruct");
    // jsonGeneratorModel = this.aiProvider("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
    // jsonGeneratorModel = this.aiProvider("@cf/moonshotai/kimi-k2.5");
    jsonGeneratorModel = this.aiProvider("@cf/meta/llama-3.1-8b-instruct-fast");
    gameModel = this.aiProvider("@cf/openai/gpt-oss-120b");

    get dynamicSystemPrompt() {
        return `
        You are a DM running a roleplaying game. 
        CURRENT GAME STATE:
        ${encode(this.state)}

        YOUR RULES:
        1. Speak entirely in character. Narrate outcomes cinematically.
        2. NEVER output raw JSON, code, or tool names.
        3. If the player attacks, moves, interacts, or TALKS to an NPC, you MUST use 'executeGameAction' to resolve it mechanically.
        4. Fast Travel: The player can move to any known location. Unknown locations will be generated automatically.
        5. Dialogue & Memory: If the player speaks to an NPC, use the 'talk' action. If the player reveals important long-term information, use the 'npcMemoryUpdate' parameter.
        `;
    }

    async onStart() {
        // check if we have an existing game state on startup
        const state = this.state as unknown as GameState;

        console.log(state.player);
        if (!state.player && this.messages.length === 0) {
            console.log("📡 Initializing fresh session. Setting status to setup...");
            this.setState({ status: "setup" } as any);
        } else if (state.player) {
            console.log(`📡 Resuming session for ${state.player.name}... (Status: ${state.status})`);
        }
    }

    @callable()
    async reset() {
        // Clear all state keys
        const stateKeys = Object.keys(this.state);
        for (const key of stateKeys) {
            delete (this.state as any)[key];
        }
        this.setState({ status: "setup" } as any);

        // Clear message history if possible
        try {
            // @ts-ignore - sql is available in AIChatAgent but might not be in types
            if (typeof this.sql === "function") {
                // @ts-ignore
                await this.sql`DELETE FROM messages`;
            }
        } catch (error) {
            console.error("Failed to clear messages:", error);
        }

        console.log("📡 Session reset. Status set to setup.");
    }

    @callable()
    @timer
    async startGame(config: { theme: string; setting: string; name: string; characterClass: string; stats: Record<Ability, number> }) {
        // Clear all state keys but preserve basic structure if needed
        const stateKeys = Object.keys(this.state);
        for (const key of stateKeys) {
            delete (this.state as any)[key];
        }

        console.log("🎮 Generating procedural world for:", config);
        try {
            const initialState: GameState = await initializeGameState({ ...config, level: 1, jsonGeneratorModel: this.jsonGeneratorModel });

            initialState.player.name = config.name;
            initialState.status = "playing";

            this.setState(initialState);
            console.log("✅ Game state generated successfully.");
        } catch (error) {
            console.error("Initialization error:", error);
            this.setState({ status: "setup" } as any); // Fallback to setup if generation fails
        }
    }
    async onChatMessage(onFinish: unknown, options?: OnChatMessageOptions) {
        console.log(this.dynamicSystemPrompt);

        const result = streamText({
            model: this.gameModel,
            system: this.dynamicSystemPrompt, // Pulls the newly generated state!
            messages: pruneMessages({
                messages: await convertToModelMessages(this.messages),
                toolCalls: "before-last-2-messages",
            }),

            tools: {
                executeGameAction: tool({
                    description: "Updates the deterministic game engine for attacks, movement, interacting, consuming, or talking. YOU MUST USE IDs (e.g., 'enemy_goblin_123'), NOT NAMES.",
                    inputSchema: z.object({
                        actionType: z.enum(["attack", "move", "interact", "consume", "talk", "trade"]).describe("The type of mechanical action to perform."),
                        targetId: z.string().describe("The EXACT string ID of the target from the current state JSON (e.g., 'enemy_goblin_123', 'prop_barrel_456', 'room_corridor_789'). DO NOT use display names."),
                        spokenWords: z.string().optional().describe("REQUIRED if actionType is 'talk'. The exact words the player is saying to the NPC."),
                        npcMemoryUpdate: z.string().optional().describe("If actionType is 'talk' and the player reveals a major secret, summarize it here to add to the NPC's core memories."),
                    }),
                    execute: async ({ actionType, targetId, spokenWords, npcMemoryUpdate }) => {
                        let systemLog = "";

                        try {
                            switch (actionType) {
                                case "move":
                                    systemLog = moveAction(this.state, targetId);
                                    break;
                                case "interact":
                                    systemLog = interactAction(this.state, targetId);
                                    break;
                                case "consume":
                                    systemLog = consumeAction(this.state, targetId);
                                    break;
                                case "attack":
                                    systemLog = attackAction(this.state, targetId);
                                    break;
                                case "talk":
                                    systemLog = talkAction(this.state, targetId, spokenWords || "Hello.");
                                    // Optional memory update logic
                                    if (npcMemoryUpdate && this.state.actors[targetId]) {
                                        this.state.actors[targetId].coreMemories.push(npcMemoryUpdate);
                                        systemLog += ` [System: Updated NPC core memories with new fact.]`;
                                    }
                                    break;
                                case "trade":
                                    // We haven't built trade.ts yet, so we use a placeholder response
                                    systemLog = `Trade action triggered for ID ${targetId}. System note to DM: Narrate the merchant showing their wares and list their inventory.`;
                                    break;
                                default:
                                    systemLog = `Action failed: Unknown action type '${actionType}'.`;
                            }
                        } catch (error) {
                            console.error("Action execution error:", error);
                            systemLog = `System Error processing action: The engine encountered a fault.`;
                        }
                        return systemLog;
                    },
                }),
            },
            stopWhen: ({ steps }) => steps.length >= 20,
            toolChoice: "required",
            abortSignal: options?.abortSignal,
        });

        return result.toUIMessageStreamResponse();
    }

    async executeTask(description: string, _task: Schedule<string>) {
        console.log(`⏰ [Task] Executing scheduled task: ${description}`);
        this.broadcast(
            JSON.stringify({
                type: "scheduled-task",
                description,
                timestamp: new Date().toISOString(),
            }),
        );
    }
}

export default {
    async fetch(request: Request, env: Env) {
        return (await routeAgentRequest(request, env)) || new Response("Not found", { status: 404 });
    },
} satisfies ExportedHandler<Env>;
