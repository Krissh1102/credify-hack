import { NextResponse } from 'next/server'

// ✅ Step 1: Verification endpoint (for Meta webhook setup)
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === 'mysecret123') {
    return new Response(challenge, { status: 200 })
  } else {
    return new Response('Forbidden', { status: 403 })
  }
}

// ✅ Step 2: Receive WhatsApp messages
export async function POST(req) {
  const body = await req.json()
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

  if (message?.text) {
    const from = message.from   // user phone number
    const text = message.text.body // message content

    // Example: "snacks ₹200"
    const [category, amountRaw] = text.split(" ")
    const amount = amountRaw.replace("₹", "")

    console.log("💸 New transaction:", { from, category, amount })

    // TODO: Save to your DB (Prisma/Supabase/Firebase)
  }

  return NextResponse.json({ status: "ok" })
}
