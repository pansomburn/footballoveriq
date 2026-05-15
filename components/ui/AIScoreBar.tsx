'use client'
import { signalColor, signalAccent } from '@/lib/scoring'
import type { Signal } from '@/types'

interface Props {
  score:  number
  signal: Signal
  size?:  'sm' | 'lg'
}

export function AIScoreBar({ score, signal, size = 'sm' }: Props) {
  const isLg = size === 'lg'
  return (
    <div className="flex items-center gap-[10px]" style={{ padding: isLg ? '14px 16px' : '10px 12px', background:'var(--bg3)', borderRadius:10, border:'1px solid var(--border2)' }}>
      <span className="text-[11px] font-medium uppercase tracking-[.06em] whitespace-nowrap" style={{ color:'var(--muted)' }}>
        AI Score
      </span>
      <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background:'var(--bg4)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: signalAccent(signal) }}
        />
      </div>
      <span
        className={`font-mono font-medium text-right ${isLg ? 'text-[28px]' : 'text-[14px]'}`}
        style={{ color: signalColor(signal), minWidth: isLg ? 52 : 30 }}
      >
        {score}
      </span>
    </div>
  )
}
