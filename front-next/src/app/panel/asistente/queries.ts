"use client";

import { useMutation } from "@tanstack/react-query";

import { apiRequest } from "@/lib/browser-api";
import { assistantAnswerSchema, type AssistantAnswer } from "@/lib/schemas/asistente";
import { dataOf } from "@/lib/schemas/carta";

export function useAskAssistant() {
  return useMutation<AssistantAnswer, Error, string>({
    mutationFn: async (mensaje) => (await apiRequest("asistente/chat", dataOf(assistantAnswerSchema), { method: "POST", body: { mensaje } })).data,
  });
}
