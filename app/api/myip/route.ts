import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') 
          || request.headers.get('x-real-ip')
          || 'unknown'
  return NextResponse.json({ ip })
}