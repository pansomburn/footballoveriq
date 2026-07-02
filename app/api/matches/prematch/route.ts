import { NextResponse } from 'next/server'
import { getProviderErrorMessage } from '@/lib/footballProvider'
import { isLsportsConfigured, LsportsProvider } from '@/lib/lsportsApi'
import { getMockPreMatches } from '@/lib/mockData'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  try {
    if (!isLsportsConfigured()) {
      return NextResponse.json({ data: getMockPreMatches(date), source: 'mock' })
    }

    const provider = new LsportsProvider()
    const data = await provider.getPreMatches(date)

    if (data.length === 0) {
      return NextResponse.json({ data: getMockPreMatches(date), source: 'mock-empty' })
    }

    return NextResponse.json({ data, source: provider.source })
  } catch (error) {
    const message = getProviderErrorMessage(error)
    console.error('[/api/matches/prematch]', error)
    return NextResponse.json({ data: getMockPreMatches(date), source: 'mock-error', error: message })
  }
}
