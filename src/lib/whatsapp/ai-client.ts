import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  type Content,
} from "@google/generative-ai";
import { toolDeclarations, executeTool, type ToolContext } from "./tools";

const API_KEY = process.env.GOOGLE_AI_API_KEY ?? "";

const MAX_TOOL_ROUNDS = 5;

/**
 * Sends a message to Gemini with tool calling support.
 * Handles multi-round tool execution (Gemini calls tool -> we execute -> feed result back).
 * Returns the final text response.
 */
export async function chatWithGemini(
  systemPrompt: string,
  conversationHistory: Content[],
  userMessage: string,
  toolCtx: ToolContext
): Promise<string> {
  if (!API_KEY) {
    console.error("[AI Client] GOOGLE_AI_API_KEY not set");
    return "El asistente no está disponible en este momento. Por favor llamá a la clínica.";
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    tools: [
      {
        functionDeclarations: toolDeclarations as FunctionDeclaration[],
      },
    ],
  });

  // Build history + new user message
  const contents: Content[] = [
    ...conversationHistory,
    { role: "user", parts: [{ text: userMessage }] },
  ];

  let currentPatientId = toolCtx.patientId;

  try {
    let result = await model.generateContent({ contents });
    let response = result.response;

    // Tool calling loop
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const candidate = response.candidates?.[0];
      if (!candidate) break;

      const functionCalls = candidate.content.parts.filter(
        (p) => "functionCall" in p
      );

      if (functionCalls.length === 0) break;

      // Execute each function call
      const functionResponses: Content = {
        role: "function" as const,
        parts: [],
      };

      for (const part of functionCalls) {
        if (!("functionCall" in part) || !part.functionCall) continue;
        const fc = part.functionCall;
        console.log(
          `[AI Client] Tool call: ${fc.name}(${JSON.stringify(fc.args)})`
        );

        const { result: toolResult, newPatientId } = await executeTool(
          fc.name,
          (fc.args as Record<string, unknown>) ?? {},
          { ...toolCtx, patientId: currentPatientId }
        );

        if (newPatientId) {
          currentPatientId = newPatientId;
        }

        functionResponses.parts.push({
          functionResponse: {
            name: fc.name,
            response: { result: toolResult },
          },
        });
      }

      // Feed tool results back to Gemini
      const updatedContents: Content[] = [
        ...contents,
        candidate.content,
        functionResponses,
      ];

      result = await model.generateContent({ contents: updatedContents });
      response = result.response;
    }

    return response.text() || "No pude generar una respuesta. Intentá de nuevo.";
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[AI Client] Error:", message);
    return "Disculpá, tuve un problema procesando tu mensaje. Intentá de nuevo o llamá a la clínica.";
  }
}
