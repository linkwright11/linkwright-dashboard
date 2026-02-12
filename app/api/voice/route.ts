import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const from = formData.get('From') as string
    const callSid = formData.get('CallSid') as string

    console.log('📞 Incoming call from:', from)
    console.log('📞 Call SID:', callSid)

    // Log call to database
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        customer_phone: from,
        transcript: 'Call in progress...',
        duration_seconds: 0,
        status: 'in_progress'
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
    } else {
      console.log('✅ Call logged to database:', conversation.id)
    }

    // Create TwiML to connect to ElevenLabs
    const twiml = new twilio.twiml.VoiceResponse()
    
    // Connect to ElevenLabs Conversational AI via WebSocket
    const connect = twiml.connect()
    connect.stream({
      url: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${process.env.ELEVENLABS_AGENT_ID}`,
      parameters: {
        authorization: `Bearer ${process.env.ELEVENLABS_API_KEY}`,
      }
    })

    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  } catch (error) {
    console.error('Error handling call:', error)
    
    // Fallback message
    const twiml = new twilio.twiml.VoiceResponse()
    twiml.say({ voice: 'Google.en-GB-Standard-A' }, 
      'We apologize, but we are experiencing technical difficulties. Please try again later.'
    )
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  }
}