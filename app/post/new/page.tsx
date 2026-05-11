import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { NewPostForm } from './NewPostForm'

export default async function NewPostPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subVillages } = await supabase
    .from('sub_villages')
    .select('id, name')
    .order('name')

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto">
        {/* Nav */}
        <div className="p-4 bg-white border-b border-slate-200">
          <Link
            href="/feed"
            className="text-sm text-emerald-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 rounded"
          >
            ← Back to feed
          </Link>
        </div>

        <div className="p-6 bg-white m-4 rounded-2xl shadow-sm border border-slate-200">
          <h1
            className="text-2xl font-bold text-slate-900 mb-6"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            New Post
          </h1>
          <NewPostForm
            userId={user.id}
            subVillages={subVillages ?? []}
          />
        </div>
      </div>
    </div>
  )
}
