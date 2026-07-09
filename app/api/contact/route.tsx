import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, hospital, phone, email, message } = body

    if (!name || !hospital) {
      return NextResponse.json({ error: 'Name and hospital are required' }, { status: 400 })
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase.from('contact_leads').insert({
      name,
      hospital,
      phone:   phone   || null,
      email:   email   || null,
      message: message || null,
    })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Notify Zapier directly from the API route
    try {
      await fetch('https://hooks.zapier.com/hooks/catch/28192631/4ui7j9u/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, hospital, phone, email, message }),
      })
    } catch {
      // Don't fail if Zapier is down
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
