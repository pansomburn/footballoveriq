import type { LiveMatch, PreMatch } from '@/types'

export interface FootballProvider {
  readonly source: string
  getLiveMatches(): Promise<LiveMatch[]>
  getPreMatches(date: string): Promise<PreMatch[]>
}

export interface ProviderResult<T> {
  data: T[]
  source: string
  error?: string
}

export function getProviderErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown provider error'
}
