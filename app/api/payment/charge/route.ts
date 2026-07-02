import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>

interface ChargeResponse {
  id?: string
  failure_code?: string
  failure_message?: string
}

// Plan pricing in satang (1 THB = 100 satang)
const PLANS: Record<string, { amount: number; label: string; days: number }> = {
  basic_weekly:  { amount:  14900, label: 'Basic รายสัปดาห์',  days: 7  },
  basic_monthly: { amount:  19900, label: 'Basic รายเดือน',    days: 30 },
  pro_weekly:    { amount:  24900, label: 'Pro รายสัปดาห์',    days: 7  },
  pro_monthly:   { amount:  39900, label: 'Pro รายเดือน',      days: 30 },
}

export async function POST(request: Request) {
  try {
    const { token, planKey } = await request.json()

    if (!token || !planKey) {
      return NextResponse.json({ error: 'Missing token or planKey' }, { status: 400 })
    }

    const plan = PLANS[planKey]
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Verify user is authenticated
    const supabase  = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create Omise charge
    const omiseKey = process.env.OMISE_SECRET_KEY
    if (!omiseKey) {
      // Dev mode: simulate success
      await activateSubscription(supabase, user.id, planKey, plan.days, 'dev_charge_mock')
      return NextResponse.json({ success: true, source: 'mock' })
    }

    const chargeRes = await fetch('https://api.omise.co/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(omiseKey + ':').toString('base64')}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        amount:      plan.amount,
        currency:    'thb',
        source:      token,
        description: `OverIQ ${plan.label}`,
        capture:     true,
      }),
    })

    const charge = await chargeRes.json() as ChargeResponse
    if (charge.failure_code) {
      return NextResponse.json({ error: charge.failure_message ?? 'Payment failed' }, { status: 402 })
    }

    // Activate subscription in DB
    const chargeId = charge.id ?? 'unknown_charge'
    await activateSubscription(supabase, user.id, planKey, plan.days, chargeId)
    return NextResponse.json({ success: true, chargeId })

  } catch (err) {
    console.error('[/api/payment/charge]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function activateSubscription(
  supabase: ServerSupabase,
  userId:   string,
  planKey:  string,
  days:     number,
  chargeId: string,
) {
  const [planName, billing] = planKey.split('_') as [string, string]
  const end = new Date()
  end.setDate(end.getDate() + days)

  // Upsert subscription
  await supabase.from('subscriptions').upsert({
    user_id:               userId,
    plan:                  planName,
    billing_period:        billing,
    status:                'active',
    current_period_start:  new Date().toISOString(),
    current_period_end:    end.toISOString(),
    omise_charge_id:       chargeId,
  }, { onConflict: 'user_id' })

  // Update profile tier
  await supabase.from('profiles')
    .update({ tier: planName, subscription_end: end.toISOString() })
    .eq('id', userId)
}
