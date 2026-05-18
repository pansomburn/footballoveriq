import { NextResponse } from 'next/server'

export async function GET() {
  const user   = process.env.THESPORTS_USER
  const secret = process.env.THESPORTS_SECRET
  const today  = new Date().toISOString().slice(0, 10)
  
  // diary ใช้ tsp (timestamp) ไม่ใช่ date string
  const tsp = Math.floor(new Date(today).getTime() / 1000)
  
  const res = await fetch(
    `https://api.thesports.com/v1/football/match/diary?user=${user}&secret=${secret}&tsp=${tsp}`
  )
  const data = await res.json()
  return NextResponse.json({ 
    tsp, 
    today,
    code: data.code,
    total: data.query?.total,
    resultCount: data.results?.length ?? 0,
    firstMatch: data.results?.[0] ?? null,
    err: data.err ?? null,
  })
}