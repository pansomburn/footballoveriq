'use client'
import type { Signal } from '@/types'
import { signalColor, signalBg, signalBorder } from '@/lib/scoring'

export function SignalBadge({ signal }: { signal: Signal }) {
  return (
    <span style={{
      background: signalBg(signal),
      color: signalColor(signal),
      border: `1px solid ${signalBorder(signal)}`,
    }}
      className="text-[11px] font-semibold px-[9px] py-[3px] rounded-full tracking-[.04em]"
    >
      {signal}
    </span>
  )
}
