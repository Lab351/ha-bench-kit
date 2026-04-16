import { randomUUID } from "node:crypto";

import { ClientFactory } from "@a2a-js/sdk/client";
import type { Message, MessageSendParams, Task, TextPart } from "@a2a-js/sdk";

import type { ConversationTurn } from "../cases/schema.js";

export type A2AConversationTurnResult = {
  request: ConversationTurn;
  response: Message | Task;
  responseText: string;
};

function toMessageParams(
  turn: ConversationTurn,
  contextId?: string,
): MessageSendParams {
  return {
    message: {
      kind: "message",
      messageId: randomUUID(),
      role: turn.role === "assistant" ? "agent" : "user",
      contextId,
      parts: [{ kind: "text", text: turn.content }],
    },
  };
}

function isMessage(response: Message | Task): response is Message {
  return response.kind === "message";
}

function extractContextId(response: Message | Task): string | undefined {
  return isMessage(response) ? response.contextId : response.contextId;
}

function extractTextParts(parts: { kind: string }[]): string[] {
  return parts
    .filter((part): part is TextPart => part.kind === "text")
    .map((part) => part.text);
}

export function extractResponseText(response: Message | Task): string {
  if (isMessage(response)) {
    return extractTextParts(response.parts).join("\n").trim();
  }

  const statusMessage = response.status.message;
  const artifactTexts = (response.artifacts ?? []).flatMap((artifact) =>
    extractTextParts(artifact.parts),
  );

  return [statusMessage?.parts ? extractTextParts(statusMessage.parts).join("\n") : "", ...artifactTexts]
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function createA2AClient(a2aServiceUrl: string) {
  const factory = new ClientFactory();
  return factory.createFromUrl(a2aServiceUrl);
}

export async function runA2AConversation(
  a2aServiceUrl: string,
  turns: ConversationTurn[],
): Promise<A2AConversationTurnResult[]> {
  const client = await createA2AClient(a2aServiceUrl);
  const results: A2AConversationTurnResult[] = [];
  let contextId: string | undefined;

  for (const turn of turns) {
    const response = await client.sendMessage(toMessageParams(turn, contextId));
    const responseText = extractResponseText(response);

    results.push({
      request: turn,
      response,
      responseText,
    });

    contextId = extractContextId(response) ?? contextId;
  }

  return results;
}
