import "server-only"

import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"

/**
 * The single swappable seam for the chat model.
 *
 * Phase 2 defaults to OpenAI. To move to another provider — e.g.
 * `@ai-sdk/anthropic` — implement `AiProvider` against it and re-point
 * `aiProvider` below. No feature code (tools, the chat route, the UI) ever
 * references a concrete provider, so swapping is a one-line change here.
 */
export interface AiProvider {
  /** Model that drives the chat / tool-call loop. */
  chatModel(): LanguageModel
}

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/** Default OpenAI implementation, via the Vercel AI SDK. */
export const openAiProvider: AiProvider = {
  chatModel() {
    // Defaults to a small, fast, tool-capable model; override with OPENAI_MODEL.
    return openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini")
  },
}

/** Active provider. Swap this binding to change providers app-wide. */
export const aiProvider: AiProvider = openAiProvider

/** Convenience accessor used by the chat route and tools. */
export function chatModel(): LanguageModel {
  return aiProvider.chatModel()
}
