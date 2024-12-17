import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify the session using the token
    const { data: { user }, error: verifyError } = await supabase.auth.getUser(token)
    
    if (verifyError || !user) {
      console.error('Auth verification error:', verifyError)
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to send invitations' },
        { status: 401 }
      )
    }

    const { eventId, eventTitle, invitations, userId } = await request.json()
    
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    console.log('Received request:', { 
      eventId, 
      eventTitle, 
      invitationsCount: invitations.length,
      userId,
      authUserId: user.id 
    })
    
    // Verify that the user has permission to send invites for this event
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .single()

    if (eventError) {
      console.error('Event error details:', {
        code: eventError.code,
        message: eventError.message,
        details: eventError.details
      })
      return NextResponse.json(
        { error: `Failed to fetch event: ${eventError.message}` },
        { status: 500 }
      )
    }

    if (!eventData) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (eventData.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You do not have permission to send invites for this event' },
        { status: 403 }
      )
    }

    // Send emails in parallel
    try {
      console.log('Starting email sending process...')
      console.log('Resend API Key exists:', !!process.env.RESEND_API_KEY)
      
      const emailResults = await Promise.all(
        invitations.map(async (invitation: any) => {
          const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/e/${eventId}?code=${invitation.invite_code}`
          
          console.log('Preparing email:', {
            to: invitation.email,
            inviteUrl,
            eventTitle
          })
          
          try {
            const result = await resend.emails.send({
              from: 'onboarding@resend.dev',
              to: invitation.email,
              subject: `You're invited to ${eventTitle}`,
              html: `
                <h1>You're invited!</h1>
                <p>You've been invited to ${eventTitle}.</p>
                <p>Click the link below to view the event details and RSVP:</p>
                <a href="${inviteUrl}">${inviteUrl}</a>
              `
            })
            
            console.log('Email sent successfully:', result)
            return result
          } catch (error) {
            console.error('Individual email error:', {
              email: invitation.email,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            throw error
          }
        })
      )
      
      console.log('All email results:', emailResults)
      return NextResponse.json({ success: true, emailResults })
    } catch (emailError) {
      console.error('Email sending error:', {
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
        stack: emailError instanceof Error ? emailError.stack : undefined
      })
      return NextResponse.json(
        { error: `Failed to send emails: ${emailError instanceof Error ? emailError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Detailed error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invitations' },
      { status: 500 }
    )
  }
} 