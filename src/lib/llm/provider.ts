export interface LLMProvider {
  generate(system: string, user: string): Promise<string>
}

export type FetchImpl = typeof fetch
