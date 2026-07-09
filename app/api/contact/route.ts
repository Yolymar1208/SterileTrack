import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, hospital, phone, email, message } = body

    if (!name || !hospital) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
    const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const apiKey        = SERVICE_KEY || ANON_KEY

    const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_leads`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({ name, hospital, phone: phone || null, email: email || null, message: message || null }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Supabase REST error:', errText)
      return NextResponse.json({ error: errText }, { status: 500 })
    }

    // Notify Zapier
    try {
      await fetch('https://hooks.zapier.com/hooks/catch/28192631/4ui7j9u/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, hospital, phone, email, message }),
      })
    } catch { /* silent fail */ }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('API route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
