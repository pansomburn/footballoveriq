import { NextResponse } from 'next/server'

export async function GET() {
  const user   = process.env.THESPORTS_USER
  const secret = process.env.THESPORTS_SECRET
  
  const res = await fetch(
    `https://api.thesports.com/v1/football/match/live?user=${user}&secret=${secret}`
  )
  const data = await res.json()
  return NextResponse.json(data)
}