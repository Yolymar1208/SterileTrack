import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, hospital, phone, email, message } = body

    if (!name || !hospital) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
    const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const apiKey       = SERVICE_KEY || ANON_KEY

    // Save to Supabase
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/contact_leads`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        name,
        hospital,
        phone:   phone   || null,
        email:   email   || null,
        message: message || null,
      }),
    })

    if (!dbRes.ok) {
      const errText = await dbRes.text()
      console.error('Supabase error:', errText)
      return NextResponse.json({ error: errText }, { status: 500 })
    }

    // Send email via Brevo
    const BREVO_KEY = process.env.BREVO_API_KEY
    if (BREVO_KEY) {
      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': BREVO_KEY,
          },
          body: JSON.stringify({
            sender: {
              name:  'SterileTrack',
              email: 'noreply@steriletrak.com',
            },
            to: [{ email: 'yolymarorfiano@yahoo.com', name: 'Yolymar Orfiano' }],
            subject: `New Demo Request — ${name} (${hospital})`,
            textContent: `
New demo request from steriletrak.com!

Name: ${name}
Hospital: ${hospital}
Phone: ${phone || 'Not provided'}
Email: ${email || 'Not provided'}
Message: ${message || 'No message'}

View all leads: https://steriletrak.com/superadmin/leads
            `.trim(),
          }),
        })
      } catch (emailErr) {
        console.error('Brevo error:', emailErr)
        // Don't fail the form if email fails
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('API route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
