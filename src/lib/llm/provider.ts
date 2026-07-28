export type FetchImpl = typeof fetch

export interface LLMProvider {
  generate(system: string, user: string): Promise<string>
}
