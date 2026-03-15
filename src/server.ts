import { createWorkersAI } from "workers-ai-provider";
import { routeAgentRequest, callable, type Schedule } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { streamText, convertToModelMessages, pruneMessages, tool, stepCountIs } from "ai";
import { json, z } from "zod";
import type { GameState } from "./types/game";
import initializeGameState from "./actions/InitializeGameState"; // The pipeline we just built!
import { moveAction } from "./actions/move";
import { interactAction } from "./actions/interact";
import { consumeAction } from "./actions/consume";
import { attackAction } from "./actions/attack";
import { talkAction } from "./actions/talk";

export class ChatAgent extends AIChatAgent<Env, GameState> {
    theme = "dark fantasy";
    setting = "A cursed underground labyrinth";
    playerClass = "Rogue"; // Could be passed in via a setup message later!
    level = 1;
    waitForMcpConnections = true;
    numberOfGeneratedStates = 0;

    aiProvider = createWorkersAI({ binding: this.env.AI });
    jsonGeneratorModel = this.aiProvider("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
    gameModel = this.aiProvider("@cf/openai/gpt-oss-120b");

    // 🛑 CRITICAL CHANGE: Make this a getter!
    // This ensures that every time the LLM is called, it reads the FRESHEST state from disk,
    // not the state from when the Durable Object first booted up.
    get dynamicSystemPrompt() {
        return `
        You are a DM running a roleplaying game. 
        CURRENT GAME STATE:
        ${JSON.stringify(this.state, null, 2)}

        YOUR RULES:
        1. Speak entirely in character. Narrate outcomes cinematically.
        2. NEVER output raw JSON, code, or tool names.
        3. If the player attacks, moves, interacts, or TALKS to an NPC, you MUST use 'executeGameAction' to resolve it mechanically.
        4. Fast Travel: The player can move to any known location. Unknown locations will be generated automatically.
        5. Dialogue & Memory: If the player speaks to an NPC, use the 'talk' action. If the player reveals important long-term information, use the 'npcMemoryUpdate' parameter.
        `;
    }

    async onStart() {
        console.log("🎮 Generating new procedural dungeon state...");
        initializeGameState(this.setting, this.theme, this.level, this.playerClass, this.jsonGeneratorModel)
            .then((initialState) => {
                Object.assign(this.state, initialState);
                console.log("✅ Initial game state set on Durable Object startup.");
            })
            .catch((error) => {
                console.error("❌ Failed to initialize game state on startup:", error);
            });
    }

    @callable()
    async restartGame() {
        this.numberOfGeneratedStates = 0;
        // Clear the state by deleting all keys
        const state = this.state as unknown as Record<string, unknown>;
        for (const key of Object.keys(state)) {
            delete state[key];
        }
        // ensureInitialized will be called by the next chat message
        await this.onStart();
    }
    async onChatMessage(onFinish: unknown, options?: OnChatMessageOptions) {
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

                        // 🔥 CRITICAL UPDATE: Forcing the ID
                        targetId: z.string().describe("The EXACT string ID of the target from the current state JSON (e.g., 'enemy_goblin_123', 'prop_barrel_456', 'room_corridor_789'). DO NOT use display names."),

                        spokenWords: z.string().optional().describe("REQUIRED if actionType is 'talk'. The exact words the player is saying to the NPC."),

                        npcMemoryUpdate: z.string().optional().describe("If actionType is 'talk' and the player reveals a major secret, summarize it here to add to the NPC's core memories."),
                    }),
                    execute: async ({ actionType, targetId, spokenWords, npcMemoryUpdate }) => {
                        let systemLog = "";

                        try {
                            // Cloudflare AIChatAgent automatically proxies `this.state`.
                            // By mutating it directly inside these functions, Cloudflare knows EXACTLY
                            // which properties changed and saves them to the Durable Object disk automatically!
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
            stopWhen: ({ steps }) => steps.length >= 10,
            toolChoice: "auto",
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
