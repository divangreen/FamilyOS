import { createClient } from '@/lib/supabase/server'
import type { ApplicationStatus } from '@/lib/supabase/types'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    // Require authentication + admin role
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role from app_metadata (set server-side, not spoofable)
    const isAdmin =
      (user.app_metadata?.role as string) === 'admin'

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { applicationId, decision, notes } = (await request.json()) as {
      applicationId: string
      decision: ApplicationStatus
      notes?: string
    }

    if (!applicationId || !decision) {
      return NextResponse.json(
        { error: 'Missing applicationId or decision' },
        { status: 400 }
      )
    }

    // Fetch application to get user_id
    const { data: app, error: fetchError } = await (supabase
      .from('expert_applications') as any)
      .select('user_id')
      .eq('id', applicationId)
      .single()

    if (fetchError || !app) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Update application
    const { error: updateError } = await (supabase
      .from('expert_applications') as any)
      .update({
        status: decision,
        reviewed_at: new Date().toISOString(),
        reviewer_id: user.id,
        reviewer_notes: notes || null,
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('Update application error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update application' },
        { status: 500 }
      )
    }

    // If approved, update user role
    if (decision === 'approved') {
      const { error: userError } = await (supabase
        .from('users') as any)
        .update({
          is_verified_expert: true,
          role: 'expert',
        })
        .eq('id', app.user_id)

      if (userError) {
        console.error('Update user error:', userError)
        return NextResponse.json(
          { error: 'Failed to update user role' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Expert review route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
