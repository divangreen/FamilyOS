import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Require authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const specialty = formData.get('specialty') as string
    const document = formData.get('document') as File | null

    if (!specialty || !document) {
      return NextResponse.json(
        { error: 'Missing specialty or document' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (document.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Document too large (max 10MB)' },
        { status: 400 }
      )
    }

    const serviceSupabase = await createServiceClient()

    // Upload document to Supabase Storage
    const timestamp = Date.now()
    const filename = `${timestamp}-${document.name}`
    const path = `expert-docs/${user.id}/${filename}`

    const arrayBuffer = await document.arrayBuffer()
    const { error: uploadError } = await serviceSupabase.storage
      .from('expert-documents')
      .upload(path, Buffer.from(arrayBuffer))

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload document' },
        { status: 500 }
      )
    }

    // Generate signed URL (7 days)
    const { data: signedUrl, error: signError } = await serviceSupabase.storage
      .from('expert-documents')
      .createSignedUrl(path, 7 * 24 * 60 * 60)

    if (signError) {
      console.error('Sign URL error:', signError)
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      )
    }

    // Upsert application
    const { error: upsertError } = await (supabase
      .from('expert_applications') as any)
      .upsert(
        [
          {
            user_id: user.id,
            specialty,
            document_path: path,
            document_signed_url: signedUrl.signedUrl,
            status: 'pending',
          },
        ],
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return NextResponse.json(
        { error: 'Failed to create application' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Expert apply route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
